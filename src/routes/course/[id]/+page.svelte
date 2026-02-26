<script lang="ts">
    import type { PageProps } from "./$types";
    import { grades } from "$lib/stores/grades.svelte";
    import { goto } from "$app/navigation";

    let { data }: PageProps = $props();

    const course = $derived(grades.getCourse(data.courseId)!);
    const proj = $derived(grades.projectedGrade(data.courseId));
    const totalWeight = $derived(grades.totalWeight(data.courseId));

    function getGradeColor(g: number | null): string {
        if (g === null) return "#6b7280";
        if (g >= 90) return "#4ade80";
        if (g >= 80) return "#86efac";
        if (g >= 65) return "#fbbf24";
        if (g >= 50) return "#fb923c";
        return "#f87171";
    }

    function getLetterGrade(g: number | null): string {
        if (g === null) return "—";
        if (g >= 90) return "S";
        if (g >= 80) return "A";
        if (g >= 70) return "B";
        if (g >= 60) return "C";
        if (g >= 50) return "D";
        return "F";
    }

    function handleScoreInput(compId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0)) {
            grades.updateScore(data.courseId, compId, num);
        }
    }

    function handleWeightInput(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= 100) {
            grades.updateWeight(data.courseId, compId, num);
        }
    }

    function handleMaxScoreInput(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0) {
            grades.updateMaxScore(data.courseId, compId, num);
        }
    }

    let confirmReset = $state(false);
    let editingName = $state<string | null>(null);

    const gradeColor = $derived(getGradeColor(proj.grade));
</script>

<div class="page">
    <!-- Nav -->
    <header class="header">
        <div class="header-inner">
            <div class="nav-left">
                <button class="back-btn mono" onclick={() => goto("/")}
                    >← back</button
                >
                <div class="breadcrumb mono">
                    <span style="color: oklch(0.4 0.02 265)">tracksem /</span>
                    <span style="color: {course.color}">{course.name}</span>
                </div>
            </div>

            <div class="header-actions">
                {#if confirmReset}
                    <span class="mono text-xs" style="color: #fb923c"
                        >reset to defaults?</span
                    >
                    <button
                        class="action-btn danger mono text-xs"
                        onclick={() => {
                            grades.resetCourse(data.courseId);
                            confirmReset = false;
                        }}>yes</button
                    >
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = false)}>no</button
                    >
                {:else}
                    <button
                        class="action-btn mono text-xs"
                        onclick={() => (confirmReset = true)}>reset</button
                    >
                {/if}
                <button
                    class="action-btn add mono text-xs"
                    onclick={() => grades.addComponent(data.courseId)}
                    >+ add component</button
                >
            </div>
        </div>
    </header>

    <main class="main">
        <!-- Grade hero -->
        <div class="hero" style="--accent: {course.color}">
            <div class="hero-left">
                <div
                    class="course-chip mono"
                    style="color: {course.color}; border-color: {course.color}30"
                >
                    {course.name}
                </div>
                <h1 class="course-fullname">{course.fullName}</h1>
                <div class="meta mono">
                    {proj.filled}/{proj.total} components graded
                    {#if totalWeight !== 100}
                        · <span style="color: #fb923c"
                            >⚠ weights sum to {totalWeight}%</span
                        >
                    {:else}
                        · <span style="color: oklch(0.4 0.02 265)"
                            >weights OK</span
                        >
                    {/if}
                </div>
            </div>
            <div class="hero-grade">
                <div class="letter-grade mono" style="color: {gradeColor}">
                    {getLetterGrade(proj.grade)}
                </div>
                {#if proj.grade !== null}
                    <div class="pct-grade mono" style="color: {gradeColor}">
                        {proj.grade.toFixed(2)}%
                    </div>
                    <div class="grade-note">projected</div>
                {:else}
                    <div class="grade-note">enter scores to see projection</div>
                {/if}
            </div>
        </div>

        <!-- Components table -->
        <div class="section-label mono">// components</div>

        <div class="table-wrap">
            <table class="comp-table">
                <thead>
                    <tr>
                        <th class="mono">component</th>
                        <th class="mono text-right">weight</th>
                        <th class="mono text-right">score</th>
                        <th class="mono text-right">max</th>
                        <th class="mono text-right">%</th>
                        <th class="mono text-right">contrib</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    {#each course.components as comp (comp.id)}
                        {@const pct =
                            comp.score !== null
                                ? (comp.score / comp.maxScore) * 100
                                : null}
                        {@const contrib =
                            pct !== null ? (pct * comp.weight) / 100 : null}
                        {@const barColor = getGradeColor(pct)}
                        <tr class="comp-row">
                            <!-- Name -->
                            <td>
                                {#if editingName === comp.id}
                                    <input
                                        class="name-input mono"
                                        value={comp.name}
                                        onblur={(e) => {
                                            grades.updateName(
                                                data.courseId,
                                                comp.id,
                                                (e.target as HTMLInputElement)
                                                    .value,
                                            );
                                            editingName = null;
                                        }}
                                        onkeydown={(e) => {
                                            if (e.key === "Enter")
                                                (
                                                    e.target as HTMLInputElement
                                                ).blur();
                                        }}
                                        autofocus
                                    />
                                {:else}
                                    <button
                                        class="name-display mono"
                                        ondblclick={() =>
                                            (editingName = comp.id)}
                                        onclick={() => (editingName = comp.id)}
                                    >
                                        {comp.name}
                                        <span class="edit-hint">✏</span>
                                    </button>
                                {/if}
                            </td>

                            <!-- Weight -->
                            <td class="text-right">
                                <input
                                    class="num-input mono"
                                    type="number"
                                    min="0"
                                    max="100"
                                    step="1"
                                    value={comp.weight}
                                    oninput={(e) =>
                                        handleWeightInput(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                                <span
                                    class="mono text-xs"
                                    style="color: oklch(0.45 0.02 265)">%</span
                                >
                            </td>

                            <!-- Score -->
                            <td class="text-right">
                                <input
                                    class="num-input mono score-input"
                                    type="number"
                                    min="0"
                                    max={comp.maxScore}
                                    step="0.5"
                                    placeholder="—"
                                    value={comp.score ?? ""}
                                    oninput={(e) =>
                                        handleScoreInput(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                            </td>

                            <!-- Max -->
                            <td class="text-right">
                                <input
                                    class="num-input mono"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={comp.maxScore}
                                    oninput={(e) =>
                                        handleMaxScoreInput(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                            </td>

                            <!-- Pct -->
                            <td class="text-right" style="color: {barColor}">
                                <div class="pct-cell">
                                    {#if pct !== null}
                                        <div class="mini-bar-track">
                                            <div
                                                class="mini-bar-fill"
                                                style="width: {pct}%; background: {barColor}"
                                            ></div>
                                        </div>
                                        <span class="mono text-xs"
                                            >{pct.toFixed(1)}%</span
                                        >
                                    {:else}
                                        <span
                                            class="mono text-xs"
                                            style="color: oklch(0.35 0.02 265)"
                                            >—</span
                                        >
                                    {/if}
                                </div>
                            </td>

                            <!-- Contribution -->
                            <td class="text-right">
                                <span
                                    class="mono text-xs"
                                    style="color: {contrib !== null
                                        ? barColor
                                        : 'oklch(0.35 0.02 265)'}"
                                >
                                    {contrib !== null
                                        ? contrib.toFixed(2) + "%"
                                        : "—"}
                                </span>
                            </td>

                            <!-- Remove -->
                            <td>
                                <button
                                    class="remove-btn"
                                    onclick={() =>
                                        grades.removeComponent(
                                            data.courseId,
                                            comp.id,
                                        )}
                                    title="remove">×</button
                                >
                            </td>
                        </tr>
                    {/each}
                </tbody>
            </table>
        </div>

        <!-- Totals row -->
        <div class="totals mono">
            <span
                >total weight: <strong
                    style="color: {totalWeight === 100 ? '#4ade80' : '#fb923c'}"
                    >{totalWeight}%</strong
                ></span
            >
            {#if proj.grade !== null}
                <span
                    >projected contribution: <strong
                        style="color: {getGradeColor(proj.grade)}"
                        >{((proj.grade * totalWeight) / 100).toFixed(
                            2,
                        )}%</strong
                    ></span
                >
            {/if}
        </div>

        <!-- Add button -->
        <button
            class="add-full-btn mono"
            onclick={() => grades.addComponent(data.courseId)}
        >
            + add component
        </button>
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
        padding: 0.875rem 2rem;
        position: sticky;
        top: 0;
        background: oklch(0.08 0.02 265 / 90%);
        backdrop-filter: blur(12px);
        z-index: 50;
    }

    .header-inner {
        max-width: 1100px;
        margin: 0 auto;
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .nav-left {
        display: flex;
        align-items: center;
        gap: 1rem;
    }

    .back-btn {
        font-size: 0.75rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        cursor: pointer;
        transition:
            color 0.15s,
            border-color 0.15s;
    }

    .back-btn:hover {
        color: oklch(0.85 0.01 265);
        border-color: oklch(1 0 0 / 20%);
    }

    .breadcrumb {
        font-size: 0.75rem;
        display: flex;
        gap: 0.4rem;
    }

    .header-actions {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }

    .action-btn {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 5px;
        padding: 0.3rem 0.7rem;
        color: oklch(0.7 0.02 265);
        cursor: pointer;
        transition: all 0.15s;
    }

    .action-btn:hover {
        background: oklch(1 0 0 / 10%);
        color: oklch(0.9 0.01 265);
    }

    .action-btn.danger:hover {
        color: #f87171;
        border-color: #f8717140;
    }
    .action-btn.add {
        color: #4ade80;
        border-color: #4ade8030;
    }
    .action-btn.add:hover {
        background: #4ade8015;
    }

    .main {
        max-width: 1100px;
        width: 100%;
        margin: 0 auto;
        padding: 2rem;
        flex: 1;
    }

    .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2.5rem;
        padding: 1.5rem;
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 10px;
        position: relative;
        overflow: hidden;
    }

    .hero::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--accent) 50%,
            transparent
        );
        opacity: 0.5;
    }

    .course-chip {
        font-size: 0.65rem;
        font-weight: 700;
        letter-spacing: 0.12em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 4px;
        padding: 0.12rem 0.45rem;
        display: inline-block;
        margin-bottom: 0.5rem;
    }

    .course-fullname {
        font-size: 1.4rem;
        font-weight: 600;
        letter-spacing: -0.02em;
        margin: 0 0 0.4rem;
    }

    .meta {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
    }

    .hero-grade {
        text-align: right;
    }

    .letter-grade {
        font-size: 3.5rem;
        font-weight: 800;
        line-height: 1;
        letter-spacing: -0.04em;
    }

    .pct-grade {
        font-size: 1.1rem;
        font-weight: 600;
        margin-top: 0.2rem;
    }

    .grade-note {
        font-size: 0.65rem;
        color: oklch(0.45 0.02 265);
        margin-top: 0.25rem;
    }

    .section-label {
        font-size: 0.65rem;
        font-family: "JetBrains Mono", monospace;
        color: oklch(0.38 0.02 265);
        letter-spacing: 0.05em;
        margin-bottom: 0.75rem;
    }

    .table-wrap {
        overflow-x: auto;
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 10px;
        background: oklch(0.12 0.025 265);
    }

    .comp-table {
        width: 100%;
        border-collapse: collapse;
    }

    .comp-table th {
        font-size: 0.62rem;
        font-family: "JetBrains Mono", monospace;
        color: oklch(0.4 0.02 265);
        text-transform: uppercase;
        letter-spacing: 0.08em;
        padding: 0.75rem 1rem;
        border-bottom: 1px solid oklch(1 0 0 / 8%);
        white-space: nowrap;
    }

    .comp-table th:first-child {
        text-align: left;
    }

    .comp-row {
        border-bottom: 1px solid oklch(1 0 0 / 5%);
        transition: background 0.1s;
    }

    .comp-row:last-child {
        border-bottom: none;
    }
    .comp-row:hover {
        background: oklch(1 0 0 / 2%);
    }

    .comp-row td {
        padding: 0.6rem 1rem;
        vertical-align: middle;
    }

    .name-display {
        background: none;
        border: none;
        color: oklch(0.85 0.01 265);
        font-size: 0.8rem;
        font-family: "JetBrains Mono", monospace;
        cursor: pointer;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: background 0.1s;
        text-align: left;
    }

    .name-display:hover {
        background: oklch(1 0 0 / 6%);
    }

    .edit-hint {
        opacity: 0;
        font-size: 0.6rem;
        transition: opacity 0.15s;
    }

    .name-display:hover .edit-hint {
        opacity: 0.5;
    }

    .name-input {
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: oklch(0.92 0.01 265);
        font-size: 0.8rem;
        padding: 0.15rem 0.4rem;
        width: 200px;
        outline: none;
    }

    .name-input:focus {
        border-color: #22d3ee60;
    }

    .num-input {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 4px;
        color: oklch(0.85 0.01 265);
        font-size: 0.78rem;
        padding: 0.2rem 0.4rem;
        width: 64px;
        text-align: right;
        outline: none;
        transition: border-color 0.15s;
    }

    .num-input:focus {
        border-color: #22d3ee50;
    }

    .score-input {
        border-color: #22d3ee20;
        color: #22d3ee;
    }

    .score-input:focus {
        border-color: #22d3ee80;
    }

    /* Hide number arrows */
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .num-input[type="number"] {
        -moz-appearance: textfield;
    }

    .pct-cell {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 0.4rem;
    }

    .mini-bar-track {
        width: 40px;
        height: 3px;
        background: oklch(1 0 0 / 8%);
        border-radius: 2px;
        overflow: hidden;
    }

    .mini-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.3s ease;
    }

    .remove-btn {
        background: none;
        border: none;
        color: oklch(0.35 0.02 265);
        font-size: 1rem;
        cursor: pointer;
        padding: 0.1rem 0.35rem;
        border-radius: 4px;
        line-height: 1;
        transition:
            color 0.15s,
            background 0.15s;
    }

    .remove-btn:hover {
        color: #f87171;
        background: #f8717115;
    }

    .totals {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        background: oklch(0.1 0.02 265);
        border: 1px solid oklch(1 0 0 / 6%);
        border-radius: 6px;
        font-size: 0.72rem;
        color: oklch(0.5 0.02 265);
        display: flex;
        gap: 2rem;
    }

    .add-full-btn {
        width: 100%;
        margin-top: 0.75rem;
        padding: 0.65rem;
        background: oklch(1 0 0 / 3%);
        border: 1px dashed oklch(1 0 0 / 12%);
        border-radius: 8px;
        color: oklch(0.5 0.02 265);
        font-size: 0.75rem;
        cursor: pointer;
        transition: all 0.15s;
    }

    .add-full-btn:hover {
        background: #4ade8010;
        border-color: #4ade8030;
        color: #4ade80;
    }
</style>
