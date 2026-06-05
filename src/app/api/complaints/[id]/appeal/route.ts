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
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();
    const { appealText, imageUrl } = body;

    if (!appealText) {
      return NextResponse.json({ error: "Appeal text is required" }, { status: 400 });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id },
    });

    if (!complaint) {
      return NextResponse.json({ error: "Complaint not found" }, { status: 404 });
    }

    if (complaint.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (complaint.status !== "REJECTED") {
      return NextResponse.json({ error: "Only rejected complaints can be appealed" }, { status: 400 });
    }

    const newDescription = `${complaint.description}\n\n--- Appeal Update ---\n${appealText}`;
    
    const dataToUpdate: any = {
      description: newDescription,
      status: "PENDING",
      rejectionReason: null,
    };

    if (imageUrl) {
      dataToUpdate.imageUrl = imageUrl;
    }

    const updatedComplaint = await prisma.complaint.update({
      where: { id },
      data: dataToUpdate,
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify all admins about the appeal
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" } });
    if (admins.length > 0) {
      const titleSnippet = updatedComplaint.title.substring(0, 30) + (updatedComplaint.title.length > 30 ? "..." : "");
      const notifData = admins.map(admin => ({
        userId: admin.id,
        title: "Complaint Appealed 📝",
        message: `Citizen ${updatedComplaint.user?.name || 'Unknown'} has appealed the rejected report '${titleSnippet}'.`,
        link: `/dashboard/admin`,
      }));
      await prisma.notification.createMany({ data: notifData });
    }

    socket.emit("server-broadcast-status", updatedComplaint);

    return NextResponse.json(updatedComplaint);
  } catch (error) {
    console.error("Appeal complaint error:", error);
    return NextResponse.json(
      { error: "Error appealing complaint" },
      { status: 500 }
    );
  }
}
