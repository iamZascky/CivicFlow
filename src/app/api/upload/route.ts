import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uniqueId = crypto.randomUUID();
    const uploadDir = join(process.cwd(), "public", "uploads", uniqueId);
    
    // Ensure the specific upload directory exists
    if (!existsSync(uploadDir)) {
      await mkdir(uploadDir, { recursive: true });
    }

    const filename = file.name.replace(/[^a-zA-Z0-9.-]/g, "_");
    const filePath = join(uploadDir, filename);

    await writeFile(filePath, buffer);

    const fileUrl = `/uploads/${uniqueId}/${filename}`;

    return NextResponse.json({ url: fileUrl });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Error uploading file." },
      { status: 500 }
    );
  }
}
