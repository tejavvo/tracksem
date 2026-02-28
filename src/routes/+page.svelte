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

    const courseColors = [
        "#22d3ee",
        "#a78bfa",
        "#34d399",
        "#fb923c",
        "#f472b6",
        "#60a5fa",
        "#f97316",
        "#10b981"
    ];

    function pickRandomColor(): string {
        return courseColors[Math.floor(Math.random() * courseColors.length)];
    }

    let addOpen = $state(false);
    let creatingCourse = $state(false);
    let newCourseName = $state("");
    let newCourseFullName = $state("");
    let newCourseColor = $state(pickRandomColor());

    function openAddCourse() {
        addOpen = true;
        newCourseColor = pickRandomColor();
    }

    function closeAddCourse() {
        addOpen = false;
        newCourseName = "";
        newCourseFullName = "";
        newCourseColor = pickRandomColor();
    }

    async function handleAddCourse() {
        const name = newCourseName.trim();
        if (!name || creatingCourse) return;
        const fullName = newCourseFullName.trim() || name;
        creatingCourse = true;
        await grades.addCourse(name, fullName, newCourseColor || pickRandomColor());
        creatingCourse = false;
        closeAddCourse();
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

            <div class="add-card" style="--accent: {newCourseColor}">
                <button class="add-card-closed mono" onclick={openAddCourse}>
                    + add course
                </button>
            </div>
        </div>

        {#if addOpen}
            <button
                class="modal-backdrop"
                type="button"
                onclick={closeAddCourse}
                aria-label="Close add course dialog"
            ></button>
            <div class="modal" role="dialog" aria-modal="true" aria-labelledby="add-course-title">
                <div class="modal-card" style="--accent: {newCourseColor}">
                    <div class="modal-header">
                        <div id="add-course-title" class="add-title mono">+ add course</div>
                        <button
                            class="modal-close mono"
                            disabled={creatingCourse}
                            onclick={closeAddCourse}
                            aria-label="close"
                        >
                            ×
                        </button>
                    </div>
                    <input
                        class="add-input mono"
                        placeholder="Short name (e.g. DSA)"
                        bind:value={newCourseName}
                    />
                    <input
                        class="add-input mono"
                        placeholder="Full name"
                        bind:value={newCourseFullName}
                    />
                    <div class="add-row">
                        <button
                            class="add-btn mono"
                            disabled={creatingCourse || newCourseName.trim().length === 0}
                            onclick={handleAddCourse}
                        >
                            {creatingCourse ? "adding..." : "create"}
                        </button>
                        <button
                            class="add-cancel mono"
                            disabled={creatingCourse}
                            onclick={closeAddCourse}
                        >
                            cancel
                        </button>
                    </div>
                    <div class="add-hint mono text-xs">
                        defaults: Quiz x2 · Midsem · Endsem
                    </div>
                </div>
            </div>
        {/if}

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

    .add-card {
        border: 1px dotted oklch(1 0 0 / 12%);
        border-radius: 10px;
        padding: 1.25rem;
        min-height: 220px;
        background: oklch(0.12 0.02 265 / 40%);
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
    }

    .add-card-closed {
        width: 100%;
        height: 100%;
        min-height: 140px;
        border: none;
        background: transparent;
        color: oklch(0.6 0.02 265);
        font-size: 0.8rem;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        cursor: pointer;
    }

    .add-card-closed:hover {
        color: oklch(0.9 0.01 265);
    }

    .modal-backdrop {
        position: fixed;
        inset: 0;
        background: oklch(0 0 0 / 45%);
        backdrop-filter: blur(4px);
        border: none;
        padding: 0;
        margin: 0;
        cursor: pointer;
        z-index: 100;
    }

    .modal {
        position: fixed;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 110;
        padding: 2rem;
    }

    .modal-card {
        width: min(560px, 92vw);
        background: oklch(0.12 0.02 265);
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 12px;
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        box-shadow: 0 20px 60px oklch(0 0 0 / 40%);
    }

    .modal-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
    }

    .modal-close {
        font-size: 0.9rem;
        background: none;
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 6px;
        color: oklch(0.6 0.02 265);
        padding: 0.25rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .modal-close:hover:enabled {
        color: oklch(0.9 0.01 265);
        border-color: oklch(1 0 0 / 18%);
        background: oklch(1 0 0 / 6%);
    }

    .modal-close:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .add-title {
        font-size: 0.75rem;
        letter-spacing: 0.08em;
        color: oklch(0.6 0.02 265);
        text-transform: uppercase;
    }

    .add-input {
        background: oklch(1 0 0 / 4%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 6px;
        padding: 0.45rem 0.6rem;
        color: oklch(0.9 0.01 265);
        font-size: 0.75rem;
        outline: none;
    }

    .add-input:focus {
        border-color: color-mix(in oklch, var(--accent, #6b7280) 40%, transparent);
        box-shadow: 0 0 0 1px color-mix(in oklch, var(--accent, #6b7280) 40%, transparent);
    }

    .add-row {
        display: flex;
        align-items: center;
        gap: 0.6rem;
    }

    .add-btn {
        flex: 1;
        font-size: 0.72rem;
        background: none;
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 6px;
        color: oklch(0.6 0.02 265);
        padding: 0.45rem 0.6rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .add-cancel {
        font-size: 0.72rem;
        background: none;
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 6px;
        color: oklch(0.45 0.02 265);
        padding: 0.45rem 0.6rem;
        cursor: pointer;
        transition: all 0.15s ease;
    }

    .add-btn:hover:enabled {
        color: oklch(0.9 0.01 265);
        border-color: color-mix(in oklch, var(--accent, #6b7280) 40%, transparent);
        background: color-mix(in oklch, var(--accent, #6b7280) 12%, transparent);
    }

    .add-cancel:hover:enabled {
        color: oklch(0.9 0.01 265);
        border-color: oklch(1 0 0 / 18%);
        background: oklch(1 0 0 / 6%);
    }

    .add-btn:disabled,
    .add-cancel:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .add-hint {
        font-size: 0.65rem;
        color: oklch(0.45 0.02 265);
        margin-top: 0.2rem;
    }

    .hint {
        text-align: center;
        font-size: 0.7rem;
        color: oklch(0.35 0.02 265);
        margin-top: 2rem;
    }

    /* ── Mobile ≤ 768px ──────────────────────── */
    @media (max-width: 768px) {
        .header {
            padding: 0.875rem 1rem;
        }
        .header-inner {
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .header-right {
            flex-wrap: wrap;
            gap: 0.5rem;
        }
        .overall-pill {
            padding: 0.3rem 0.65rem;
        }
        .user-group {
            padding-left: 0;
            border-left: none;
        }
        .user-email {
            max-width: 140px;
            font-size: 0.62rem;
        }
        .main {
            padding: 1.25rem 0.75rem;
        }
        .grid {
            grid-template-columns: repeat(auto-fill, minmax(min(280px, 100%), 1fr));
        }
        .add-card {
            min-height: 120px;
        }
        .add-card-closed {
            min-height: 80px;
        }
        .modal {
            padding: 1rem;
        }
        .modal-card {
            width: 100%;
        }
    }

    /* ── Extra-small ≤ 480px ─────────────────── */
    @media (max-width: 480px) {
        .header {
            padding: 0.75rem 0.65rem;
        }
        .main {
            padding: 1rem 0.5rem;
        }
        .grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
        }
    }
</style>