import { Router } from "express";
import { db } from "../db/client.js";
import { emails } from "../schema/db.schema.js";
import { makeEmailHash } from "../utils/hash.js";
import { eq } from "drizzle-orm";
import { MockEmailsSchema } from "../schema/ingest.schema.js";
import mockEmails from "../data/mockEmails.json" with { type: "json" };

const router = Router();

router.post("/ingest", async (_, res) => {
    try {
        const parsed = MockEmailsSchema.parse(mockEmails);

        let inserted = 0;
        let skipped = 0;

        for (const e of parsed) {
            const hash = makeEmailHash(e.sender, e.subject, e.body);

            const existing = await db
                .select({ id: emails.id })
                .from(emails)
                .where(eq(emails.contentHash, hash))
                .limit(1);

            if (existing.length > 0) {
                skipped++;
                continue;
            }

            await db.insert(emails).values({
                sender: e.sender,
                subject: e.subject,
                body: e.body,
                contentHash: hash,
                category: "General",
                keywords: [],
                summaryCount: 0,
            });

            inserted++;
        }

        return res.json({ ok: true, inserted, skipped, total: parsed.length });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message ?? "Ingest failed" });
    }
});

export default router;
