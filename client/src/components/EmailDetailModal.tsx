import type { EmailRow } from "../api/emails";

type Props = {
    open: boolean;
    onClose: () => void;
    email: EmailRow | null;
    onResummarize: () => void;
    loading?: boolean;
};

export default function EmailDetailModal({ open, onClose, email, onResummarize, loading }: Props) {
    if (!open || !email) return null;

    const isSummarized = email.summaryCount > 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-3xl rounded-2xl bg-white p-5 shadow-xl">
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold">{email.subject}</h2>
                        <p className="text-sm text-start text-gray-600">{email.sender}</p>
                    </div>

                    <button className="text-sm cursor-pointer p-1 text-gray-700 hover:text-black" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="mt-4 grid gap-3">
                    <div className="rounded-xl border p-3">
                        <div className="text-xs font-semibold text-gray-500">Body</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm">{email.body}</div>
                    </div>

                    <div className="rounded-xl border p-3">
                        <div className="flex items-center justify-between">
                            <div className="text-xs font-semibold text-gray-500">Summary</div>
                            <div className="text-xs text-gray-500">
                                Category: <span className="font-medium text-gray-700">{email.category}</span>
                            </div>
                        </div>

                        {loading ? <><div className="mt-1 text-sm">
                            <div className="h-4 w-3/4 animate-pulse rounded bg-gray-200"></div>
                        </div>

                            <div className="mt-2 flex flex-wrap gap-2">
                                <span className="h-6 w-16 animate-pulse rounded-full bg-gray-200"></span>
                                <span className="h-6 w-20 animate-pulse rounded-full bg-gray-200"></span>
                                <span className="h-6 w-14 animate-pulse rounded-full bg-gray-200"></span>
                            </div></>
                            : <> <div className="mt-1 text-sm">
                                {email.summary ? email.summary : <span className="text-gray-400">Not summarized yet.</span>}
                            </div>

                                <div className="mt-2 flex flex-wrap gap-2">
                                    {(email.keywords || []).map((k) => (
                                        <span key={k} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                                            {k}
                                        </span>
                                    ))}
                                </div>
                            </>}
                    </div>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={onResummarize}
                            disabled={loading}
                            className="rounded-lg cursor-pointer bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                        >
                            {isSummarized ? `Re-summarize (${email.summaryCount})` : "Summarize"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
