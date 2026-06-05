import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { io } from "socket.io-client";

const socket = io(process.env.NEXTAUTH_URL || "http://localhost:3000");

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { status, rejectionReason } = body;

    const dataToUpdate: any = { status };
    if (rejectionReason !== undefined) {
      dataToUpdate.rejectionReason = rejectionReason;
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: { id: true, name: true, email: true } },
        duplicates: { select: { id: true, userId: true } },
      },
    });

    // Always Auto-Sync children when master status changes
    if (updatedComplaint.duplicates && updatedComplaint.duplicates.length > 0) {
      await prisma.complaint.updateMany({
        where: { parentId: id },
        data: { status },
      });
    }

    if (status === "RESOLVED" || status === "REJECTED") {
      // Notifications
      const titleSnippet = updatedComplaint.title.substring(0, 30) + (updatedComplaint.title.length > 30 ? "..." : "");
      let notifTitle = "";
      let notifMessage = "";

      if (status === "RESOLVED") {
        notifTitle = "Report Resolved! 🎉";
        notifMessage = `Great news! Your report regarding '${titleSnippet}' has been resolved by our team. Thank you for keeping our city safe!`;
      } else {
        notifTitle = "Report Rejected ⚠️";
        notifMessage = `Update: Your report '${titleSnippet}' was reviewed but rejected. Reason: ${rejectionReason || "Invalid or insufficient information."}`;
      }

      // Master author
      const notificationData = [
        {
          userId: updatedComplaint.userId,
          title: notifTitle,
          message: notifMessage,
          link: `/dashboard/citizen/reports`
        }
      ];

      // Duplicate authors
      if (updatedComplaint.duplicates) {
        for (const dup of updatedComplaint.duplicates) {
          notificationData.push({
            userId: dup.userId,
            title: notifTitle,
            message: notifMessage,
            link: `/dashboard/citizen/reports`
          });
        }
      }

      // Deduplicate by userId (so if a user submitted multiple duplicates, they get 1 notification)
      const uniqueNotifications = Array.from(new Map(notificationData.map(item => [item.userId, item])).values());

      if (uniqueNotifications.length > 0) {
        await prisma.notification.createMany({
          data: uniqueNotifications
        });
      }
    }

    // Notify clients via Socket.io
    socket.emit("server-broadcast-status", updatedComplaint);

    return NextResponse.json(updatedComplaint);
  } catch (error) {
    console.error("Update complaint error:", error);
    return NextResponse.json(
      { error: "Error updating complaint" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (complaint.userId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.complaint.delete({
      where: { id },
    });

    socket.emit("server-broadcast-delete", id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete complaint error:", error);
    return NextResponse.json(
      { error: "Error deleting complaint" },
      { status: 500 }
    );
  }
}
