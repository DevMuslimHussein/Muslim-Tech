import { PrismaClient } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL ?? "admin@muslimtech.local";
  const password = process.env.ADMIN_PASSWORD ?? "ChangeMe123!";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      fullName: "Admin",
      username: process.env.ADMIN_USERNAME ?? "admin",
      email,
      passwordHash,
      role: "admin",
      status: "active",
    },
  });

  console.log(`Created admin user: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
