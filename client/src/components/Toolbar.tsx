type Props = {
    search: string;
    setSearch: (v: string) => void;

    category: string;
    setCategory: (v: string) => void;

    sort: string;
    setSort: (v: string) => void;

    selectedCount: number;

    onIngest: () => void;
    onSummarizeSelected: () => void;
    onExportSelected: () => void;

    loading?: boolean;
};

const categories = ["All", "Meeting", "Invoice", "Support Request", "HR", "General"];

export default function Toolbar({
    search,
    setSearch,
    category,
    setCategory,
    sort,
    setSort,
    selectedCount,
    onIngest,
    onSummarizeSelected,
    onExportSelected,
    loading,
}: Props) {
    return (
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
                <input
                    className="w-full lg:w-72 rounded-lg border px-3 py-2 text-sm outline-none focus:ring"
                    placeholder="Search sender, subject, body, summary..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <select
                    className="rounded-lg border px-3 py-2 text-sm"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                >
                    {categories.map((c) => (
                        <option key={c} value={c}>
                            {c}
                        </option>
                    ))}
                </select>

                <select
                    className="rounded-lg border px-3 py-2 text-sm"
                    value={sort}
                    onChange={(e) => setSort(e.target.value)}
                >
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="count">Most Summarized</option>
                </select>
            </div>

            <div className="flex flex-wrap gap-2 justify-center">
                <button
                    onClick={onIngest}
                    className="rounded-lg cursor-pointer bg-black px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                    disabled={loading || selectedCount > 0}
                >
                    Ingest Mock
                </button>

                <button
                    onClick={onSummarizeSelected}
                    className="rounded-lg cursor-pointer bg-blue-600 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                    disabled={selectedCount === 0 || loading}
                >
                    Summarize ({selectedCount})
                </button>

                <button
                    onClick={onExportSelected}
                    className="rounded-lg cursor-pointer bg-emerald-600 px-3 py-2 text-sm text-white hover:opacity-90 disabled:opacity-50"
                    disabled={selectedCount === 0 || loading}
                >
                    Export CSV ({selectedCount})
                </button>
            </div>
        </div>
    );
}
