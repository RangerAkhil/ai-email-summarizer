import { Router } from "express";
import { db } from "../db/client.js";
import { emails } from "../schema/db.schema.js";
import { inArray } from "drizzle-orm";
import { emailsToCsv } from "../utils/csv.js";
import { ExportSelectedSchema } from "../schema/emails.schema.js";

const router = Router();

router.post("/summaries/export", async (req, res) => {
    const { ids } = ExportSelectedSchema.parse(req.body);

    const rows = await db.select({
        sender: emails.sender,
        subject: emails.subject,
        email: emails.body,
        summary: emails.summary,
        createdAt: emails.createdAt,
        updatedAt: emails.updatedAt,
    }).from(emails).where(inArray(emails.id, ids));
    const csv = emailsToCsv(rows);
    res.setHeader("Content-Type", "text/csv");
    return res.send(csv);
});

export default router;
