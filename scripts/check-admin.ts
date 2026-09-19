import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const u = await db.user.findUnique({
    where: { email: "admin@psm.gov.pk" },
    include: { userRoles: { include: { role: true } } },
  });
  console.log(
    JSON.stringify(
      {
        found: !!u,
        status: u?.status,
        roles: u?.userRoles.map((r) => r.role.code) ?? [],
      },
      null,
      2,
    ),
  );
  await db.$disconnect();
}

main();
