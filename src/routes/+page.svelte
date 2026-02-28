<script lang="ts">
    import { grades } from "$lib/stores/grades.svelte";
    import CourseCard from "$lib/components/CourseCard.svelte";
    import { page } from "$app/state";
    import { createBrowserClient } from "@supabase/ssr";
    import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from "$env/static/public";
    import { goto } from "$app/navigation";

    const supabase = createBrowserClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY);

    async function logout() {
        await supabase.auth.signOut();
        goto("/auth");
    }

    function getOverallGrade(): { grade: number | null; count: number } {
        let total = 0;
        let count = 0;
        for (const course of grades.courses) {
            const proj = grades.projectedGrade(course.id);
            if (proj.grade !== null) {
                total += proj.grade;
                count++;
            }
        }
        if (count === 0) return { grade: null, count: 0 };
        return { grade: total / count, count };
    }

    const overall = $derived(getOverallGrade());

    function gradeColor(g: number | null): string {
        if (g === null) return "#6b7280";
        if (g >= 90) return "#4ade80";
        if (g >= 80) return "#86efac";
        if (g >= 65) return "#fbbf24";
        if (g >= 50) return "#fb923c";
        return "#f87171";
    }
</script>

<div class="page">
    <!-- Header -->
    <header class="header">
        <div class="header-inner">
            <div class="brand">
                <div class="brand-icon mono">&gt;_</div>
                <div>
                    <div class="brand-title mono">tracksem</div>
                    <div class="brand-sub">
                        sem 2 · {new Date().getFullYear()}
                    </div>
                </div>
            </div>

            <div class="header-right">
                {#if overall.grade !== null}
                    <div
                        class="overall-pill"
                        style="border-color: {gradeColor(overall.grade)}40; color: {gradeColor(overall.grade)}"
                    >
                        <span class="mono text-sm">avg {overall.grade.toFixed(1)}%</span>
                        <span class="mono text-xs" style="opacity: 0.6">
                            across {overall.count} course{overall.count > 1 ? "s" : ""}
                        </span>
                    </div>
                {/if}

                <div class="user-group">
                    <span class="user-email mono">{page.data.user?.email}</span>
                    <button class="logout-btn mono" onclick={logout}>sign_out</button>
                </div>
            </div>
        </div>
    </header>

    <!-- Course grid -->
    <main class="main">
        <div class="section-label mono">// courses</div>
        <div class="grid">
            {#each grades.courses as course (course.id)}
                <CourseCard {course} />
            {/each}
        </div>

        <div class="hint mono">
            click a course to enter scores &amp; manage components
        </div>
    </main>
</div>

<style>
    .page {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .header {
        border-bottom: 1px solid oklch(1 0 0 / 7%);
        padding: 1.25rem 2rem;
        position: sticky;
        top: 0;
        background: oklch(0.08 0.02 265 / 90%);
        backdrop-filter: blur(12px);
        z-index: 50;
    }

    .header-inner {
        max-width: 1200px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 1rem;
    }

    .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        flex-shrink: 0;
    }

    .brand-icon {
        font-size: 1.5rem;
        color: #22d3ee;
        line-height: 1;
    }

    .brand-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: oklch(0.95 0.01 265);
        letter-spacing: -0.02em;
    }

    .brand-sub {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
        margin-top: 1px;
    }

    .header-right {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        min-width: 0;
    }

    .overall-pill {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        border: 1px solid;
        border-radius: 20px;
        padding: 0.4rem 0.85rem;
        background: oklch(1 0 0 / 4%);
        flex-shrink: 0;
    }

    .user-group {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        min-width: 0;
        padding-left: 0.75rem;
        border-left: 1px solid oklch(1 0 0 / 8%);
    }

    .user-email {
        font-size: 0.68rem;
        color: oklch(0.38 0.02 265);
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        max-width: 180px;
    }

    .logout-btn {
        font-size: 0.68rem;
        background: none;
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 4px;
        color: oklch(0.4 0.02 265);
        padding: 0.22rem 0.55rem;
        cursor: pointer;
        transition: all 0.15s ease;
        white-space: nowrap;
        flex-shrink: 0;
    }

    .logout-btn:hover {
        color: #f87171;
        border-color: #f8717133;
        background: #f8717110;
    }

    .main {
        flex: 1;
        max-width: 1200px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
    }

    .section-label {
        font-size: 0.7rem;
        color: oklch(0.4 0.02 265);
        letter-spacing: 0.05em;
        margin-bottom: 1rem;
    }

    .grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1rem;
    }

    .hint {
        text-align: center;
        font-size: 0.7rem;
        color: oklch(0.35 0.02 265);
        margin-top: 2rem;
    }
</style>