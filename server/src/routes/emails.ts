import { Router } from "express";
import { db } from "../db/client.js";
import { emails } from "../schema/db.schema.js";
import { and, desc, eq, ilike, or, sql, asc, inArray, count } from "drizzle-orm";
import { openai } from "../ai/openai.js";
import { summarizePrompt, resummarizePrompt, ALLOWED_CATEGORIES } from "../ai/prompts.js";
import { safeJsonParse } from "../utils/json.js";
import { SummarizeBulkSchema } from "../schema/emails.schema.js";

const router = Router();

router.get("/emails", async (req, res) => {
    try {
        const search = (req.query.search as string | undefined)?.trim();
        const category = (req.query.category as string | undefined)?.trim();
        const sort = (req.query.sort as string | undefined)?.trim(); // newest|oldest|count

        // ✅ pagination (default 10)
        const pageRaw = Number(req.query.page ?? 1);
        const limitRaw = Number(req.query.limit ?? 10);

        const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
        const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.min(limitRaw, 100) : 10;

        const offset = (page - 1) * limit;

        const whereParts: any[] = [];

        if (category && category !== "All") {
            whereParts.push(eq(emails.category, category));
        }

        if (search && search.length > 0) {
            whereParts.push(
                or(
                    ilike(emails.sender, `%${search}%`),
                    ilike(emails.subject, `%${search}%`),
                    ilike(emails.body, `%${search}%`),
                    ilike(sql`coalesce(${emails.summary}, '')`, `%${search}%`)
                )
            );
        }

        const where = whereParts.length ? and(...whereParts) : undefined;

        const orderBy =
            sort === "oldest"
                ? asc(emails.createdAt)
                : sort === "count"
                    ? desc(emails.summaryCount)
                    : desc(emails.createdAt);

        // ✅ total count (for pagination UI)
        const totalResult = await db
            .select({ total: count() })
            .from(emails)
            .where(where);

        const total = totalResult[0]?.total ?? 0;


        // ✅ paginated rows
        const rows = await db
            .select()
            .from(emails)
            .where(where)
            .orderBy(orderBy)
            .limit(limit)
            .offset(offset);

        return res.json({
            ok: true,
            data: rows,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message ?? "Failed" });
    }
});


router.get("/emails/:id", async (req, res) => {
    try {
        const id = req.params.id;
        const row = await db.select().from(emails).where(eq(emails.id, id)).limit(1);

        if (!row.length) return res.status(404).json({ ok: false, error: "Not found" });

        return res.json({ ok: true, data: row[0] });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message ?? "Failed" });
    }
});


router.post("/emails/summarize", async (req, res) => {
    try {
        const { ids } = SummarizeBulkSchema.parse(req.body);

        const rows = await db.select().from(emails).where(inArray(emails.id, ids));

        const results: { id: string; ok: boolean; error?: string }[] = [];

        for (const row of rows) {
            try {
                // first summarize: summary+category+keywords
                if (row.summaryCount === 0) {
                    const resp = await openai.responses.create({
                        model: "gpt-4o-mini",
                        input: summarizePrompt(row),
                        temperature: 0.2,
                        text: {
                            format: { type: "json_object" },
                        },
                    } as any);

                    const txt = resp.output_text ?? "{}";
                    const data = safeJsonParse<{ summary: string; category: string; keywords: string[] }>(txt);

                    const summary = typeof data.summary === "string" ? data.summary.trim() : "";

                    const category = ALLOWED_CATEGORIES.includes(data.category as any)
                        ? data.category
                        : "General";

                    const keywords =
                        Array.isArray(data.keywords)
                            ? data.keywords
                                .filter((k) => typeof k === "string" && k.trim().length > 0)
                                .map((k) => k.trim())
                                .slice(0, 10)
                            : [];

                    await db
                        .update(emails)
                        .set({
                            summary,
                            category,
                            keywords,
                            summaryCount: 1,
                            lastSummarizedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(emails.id, row.id));
                } else {
                    // resummarize: summary only
                    const resp = await openai.responses.create({
                        model: "gpt-4o-mini",
                        input: resummarizePrompt(row),
                        temperature: 0.2,
                        text: {
                            format: { type: "json_object" },
                        },
                    } as any);

                    const txt = resp.output_text ?? "{}";
                    const data = safeJsonParse<{ summary: string }>(txt);
                    const summary = typeof data.summary === "string" ? data.summary.trim() : "";

                    await db
                        .update(emails)
                        .set({
                            summary,
                            summaryCount: row.summaryCount + 1,
                            lastSummarizedAt: new Date(),
                            updatedAt: new Date(),
                        })
                        .where(eq(emails.id, row.id));
                }

                results.push({ id: row.id, ok: true });
            } catch (e: any) {
                results.push({ id: row.id, ok: false, error: e.message ?? "Summarize failed" });
            }
        }

        return res.json({ ok: true, results });
    } catch (err: any) {
        console.error(err);
        return res.status(400).json({ ok: false, error: err.message ?? "Bad request" });
    }
});

router.post("/emails/:id/resummarize", async (req, res) => {
    try {
        const id = req.params.id;

        const row = await db.select().from(emails).where(eq(emails.id, id)).limit(1);
        if (!row.length) return res.status(404).json({ ok: false, error: "Not found" });

        const email = row[0];

        const resp = await openai.responses.create({
            model: "gpt-4o-mini",
            input: resummarizePrompt(email),
            temperature: 0.2,
            text: {
                format: { type: "json_object" },
            },
        } as any);

        const txt = resp.output_text ?? "{}";
        const data = safeJsonParse<{ summary: string }>(txt);

        const summary = typeof data.summary === "string" ? data.summary.trim() : "";

        await db
            .update(emails)
            .set({
                summary,
                summaryCount: email.summaryCount + 1,
                lastSummarizedAt: new Date(),
                updatedAt: new Date(),
            })
            .where(eq(emails.id, id));

        return res.json({ ok: true });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message ?? "Failed" });
    }
});

router.delete("/emails/:id", async (req, res) => {
    try {
        const id = req.params.id;
        await db.delete(emails).where(eq(emails.id, id));
        return res.json({ ok: true });
    } catch (err: any) {
        console.error(err);
        return res.status(500).json({ ok: false, error: err.message ?? "Failed" });
    }
});

export default router;
