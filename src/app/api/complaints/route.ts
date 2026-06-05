import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { analyzeComplaint, checkIfDuplicate } from "@/lib/ai";
import { io } from "socket.io-client";

// Connect to our local socket server to emit events
const socket = io(process.env.NEXTAUTH_URL || "http://localhost:3000");

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { title, description, imageUrl, latitude, longitude, incidentDate } = body;

    // AI Analysis
    const aiResult = await analyzeComplaint(title, description);
    
    const priorityUpper = aiResult.priority?.toUpperCase();
    const validPriority = ["LOW", "MEDIUM", "HIGH", "CRITICAL"].includes(priorityUpper)
      ? priorityUpper
      : "LOW";

    // Reverse Geocode to get Subdistrict (Kecamatan) using Photon
    let subdistrict = null;
    try {
      const geoRes = await fetch(`https://photon.komoot.io/reverse?lat=${latitude}&lon=${longitude}`);
      if (geoRes.ok) {
        const geoData = await geoRes.json();
        if (geoData.features && geoData.features.length > 0) {
          const props = geoData.features[0].properties;
          const parts = [];
          if (props.name) parts.push(props.name);
          if (props.village || props.suburb) parts.push(props.village || props.suburb);
          if (props.district) parts.push(props.district);
          if (props.city || props.town || props.county) parts.push(props.city || props.town || props.county);
          
          if (parts.length > 0) {
            subdistrict = Array.from(new Set(parts)).join(", ");
          } else {
            subdistrict = props.name || props.state || "Unknown";
          }
        }
      }
    } catch (e) {
      console.error("Reverse geocoding failed", e);
    }

    // Geofencing & Deduplication Check
    const activeComplaints = await prisma.complaint.findMany({
      where: {
        status: { in: ["PENDING", "IN_PROGRESS"] },
        parentId: null, // Only check against master complaints
      },
      select: { id: true, title: true, description: true, latitude: true, longitude: true, priority: true, duplicateCount: true }
    });

    const nearbyComplaints = activeComplaints.filter(c => {
      const dist = getDistanceFromLatLonInKm(latitude, longitude, c.latitude, c.longitude);
      return dist <= 0.2; // Within 200 meters
    });

    let matchedParentId = null;
    let newPriority = validPriority;

    if (nearbyComplaints.length > 0) {
      const duplicateOfId = await checkIfDuplicate(title, description, nearbyComplaints);
      if (duplicateOfId) {
        matchedParentId = duplicateOfId;
        const master = nearbyComplaints.find(c => c.id === duplicateOfId);
        if (master) {
          const newCount = master.duplicateCount + 1;
          
          let escalatedPriority = master.priority;
          if (newCount >= 5) escalatedPriority = "CRITICAL";
          else if (newCount >= 3 && master.priority !== "CRITICAL") escalatedPriority = "HIGH";
          else if (newCount >= 1 && master.priority === "LOW") escalatedPriority = "MEDIUM";

          await prisma.complaint.update({
            where: { id: master.id },
            data: { 
              duplicateCount: newCount,
              priority: escalatedPriority,
            }
          });

          newPriority = escalatedPriority;
          socket.emit("status-update", {});
        }
      }
    }

    const complaint = await prisma.complaint.create({
      data: {
        title,
        description,
        imageUrl,
        latitude,
        longitude,
        category: aiResult.suggestDelete ? "Unknown" : aiResult.category,
        priority: newPriority,
        sentiment: aiResult.sentiment,
        aiSummary: aiResult.summary,
        aiKeyIssues: aiResult.keyIssues,
        aiRecommendedAction: aiResult.recommendedAction,
        aiUrgencyReason: aiResult.urgencyReason,
        suggestDelete: aiResult.suggestDelete || false,
        subdistrict,
        parentId: matchedParentId,
        userId: session.user.id,
        incidentDate: incidentDate ? new Date(incidentDate) : null,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    // Create notifications for all admins
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (admins.length > 0) {
      await prisma.notification.createMany({
        data: admins.map((admin) => ({
          userId: admin.id,
          title: aiResult.suggestDelete ? "Action Recommended: Delete Invalid Complaint" : "New Complaint Submitted",
          message: aiResult.suggestDelete 
            ? `An invalid or unanalyzable complaint "${title}" was submitted. We recommend you delete this complaint.` 
            : `A new complaint "${title}" was submitted.`,
          link: `/dashboard/admin?tab=management`,
        })),
      });
    }

    if (aiResult.suggestDelete) {
      await prisma.notification.create({
        data: {
          userId: session.user.id,
          title: "Action Suggested: Delete Complaint",
          message: "Our AI couldn't fully understand your recent complaint. We suggest deleting it and submitting a new one with more details.",
          link: `/dashboard/citizen?tab=reports`,
        },
      });
    }

    // Notify clients via Socket.io
    socket.emit("server-broadcast-complaint", complaint);

    // Auto-delete in 5 minutes if AI couldn't understand it
    if (aiResult.suggestDelete) {
      setTimeout(async () => {
        try {
          // Check if it still exists
          const existing = await prisma.complaint.findUnique({
            where: { id: complaint.id }
          });
          if (existing) {
            await prisma.complaint.delete({
              where: { id: complaint.id }
            });
            console.log(`Automatically deleted unanalyzable complaint ${complaint.id} after 5 minutes`);
            
            // Create a notification for the user
            await prisma.notification.create({
              data: {
                userId: complaint.userId,
                title: "Complaint Auto-Deleted",
                message: `Your complaint "${complaint.title}" was automatically deleted because it lacked actionable details.`,
                link: `/dashboard/citizen?tab=reports`,
              },
            });
            
            // Tell clients to refresh data
            socket.emit("status-update", {});
          }
        } catch (err) {
          console.error("Auto-delete failed:", err);
        }
      }, 5 * 60 * 1000); // 5 minutes
    }

    return NextResponse.json(complaint, { status: 201 });
  } catch (error) {
    console.error("Create complaint error:", error);
    return NextResponse.json(
      { error: "Error creating complaint" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    const session = await getServerSession(authOptions);
    
    // Allow users to get their own, but restrict global to admins
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isPublic = url.searchParams.get("public") === "true";
    let whereClause = {};
    if (session.user.role !== "ADMIN" && !isPublic) {
      whereClause = { userId: session.user.id };
    } else if (userId) {
       whereClause = { userId };
    }

    // Passive cleanup: find and delete any 'Unknown' complaints older than 5 minutes
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const toDelete = await prisma.complaint.findMany({
      where: {
        category: "Unknown",
        createdAt: { lt: fiveMinutesAgo }
      }
    });

    if (toDelete.length > 0) {
      for (const c of toDelete) {
        await prisma.complaint.delete({ where: { id: c.id } });
        await prisma.notification.create({
          data: {
            userId: c.userId,
            title: "Complaint Auto-Deleted",
            message: `Your complaint "${c.title}" was automatically deleted because it lacked actionable details.`,
            link: `/dashboard/citizen?tab=reports`,
          },
        });
      }
      // Inform clients to refresh
      socket.emit("status-update", {});
    }

    const complaints = await prisma.complaint.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true, email: true } },
      },
    });

    return NextResponse.json(complaints);
  } catch (error) {
    console.error("Fetch complaints error:", error);
    return NextResponse.json(
      { error: "Error fetching complaints" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { ids } = body;
    if (!ids || !Array.isArray(ids)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const children = await prisma.complaint.findMany({ where: { parentId: { in: ids } } });
    const allIds = [...ids, ...children.map(c => c.id)];

    await prisma.complaint.deleteMany({
      where: { id: { in: allIds } },
    });
    
    socket.emit("status-update", {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk delete error:", error);
    return NextResponse.json({ error: "Error deleting complaints" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const body = await req.json();
    const { ids, status } = body;
    
    if (!ids || !Array.isArray(ids) || !status) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const children = await prisma.complaint.findMany({ where: { parentId: { in: ids } } });
    const allIds = [...ids, ...children.map(c => c.id)];

    await prisma.complaint.updateMany({
      where: { id: { in: allIds } },
      data: { status }
    });

    socket.emit("status-update", {});
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Bulk update error:", error);
    return NextResponse.json({ error: "Error updating complaints" }, { status: 500 });
  }
}
