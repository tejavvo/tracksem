<script lang="ts">
    import type { PageProps } from "./$types";
    import { grades, computeCompPct } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import { goto } from "$app/navigation";

    let { data }: PageProps = $props();

    const course = $derived(grades.getCourse(data.courseId)!);
    const proj = $derived(grades.projectedGrade(data.courseId));
    const totalWeight = $derived(grades.totalWeight(data.courseId));

    let expanded = $state<Set<string>>(new Set());
    function toggle(id: string) {
        const next = new Set(expanded);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        expanded = next;
    }

    let confirmReset = $state(false);
    let editingName = $state<string | null>(null);
    let editingSubName = $state<string | null>(null);

    const gradeColor = $derived(getGradeColor(proj.grade));

    function handleScore(compId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateScore(data.courseId, compId, num);
    }

    function handleSubScore(compId: string, subId: string, val: string) {
        const num = val === "" ? null : parseFloat(val);
        if (num === null || (!isNaN(num) && num >= 0))
            grades.updateSubScore(data.courseId, compId, subId, num);
    }

    function handleSubMax(compId: string, subId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateSubMaxScore(data.courseId, compId, subId, num);
    }

    function handleWeight(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num >= 0 && num <= 100)
            grades.updateWeight(data.courseId, compId, num);
    }

    function handleMax(compId: string, val: string) {
        const num = parseFloat(val);
        if (!isNaN(num) && num > 0)
            grades.updateMaxScore(data.courseId, compId, num);
    }

    function handleBestOf(compId: string, val: string, total: number) {
        const num = parseInt(val);
        if (val === "" || isNaN(num))
            grades.updateBestOf(data.courseId, compId, undefined);
        else if (num > 0 && num <= total)
            grades.updateBestOf(data.courseId, compId, num);
    }
</script>

<div class="page">
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

        <div class="section-label mono">// components</div>

        <div class="comp-list">
            {#each course.components as comp (comp.id)}
                {@const pct = computeCompPct(comp)}
                {@const barColor = getGradeColor(pct)}
                {@const contrib =
                    pct !== null ? (pct * comp.weight) / 100 : null}
                {@const hasSubItems = comp.subItems && comp.subItems.length > 0}
                {@const isOpen = expanded.has(comp.id)}

                <div class="comp-card" class:expanded={isOpen}>
                    <div class="comp-row">
                        <!-- Expand toggle -->
                        <button
                            class="expand-btn"
                            class:has-sub={hasSubItems}
                            onclick={() => {
                                if (hasSubItems) {
                                    toggle(comp.id);
                                } else {
                                    grades.addSubItem(data.courseId, comp.id);
                                    expanded = new Set([...expanded, comp.id]);
                                }
                            }}
                        >
                            {#if hasSubItems}
                                <span class="chevron mono" class:open={isOpen}
                                    >›</span
                                >
                            {:else}
                                <span
                                    class="plus-expand mono"
                                    title="add sub-items">⊕</span
                                >
                            {/if}
                        </button>

                        <!-- Name -->
                        <div class="comp-name-cell">
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
                                    onclick={() => (editingName = comp.id)}
                                >
                                    {comp.name}
                                    {#if hasSubItems}
                                        <span class="sub-count">
                                            {comp.subItems!.filter(
                                                (s) => s.score !== null,
                                            ).length}/{comp.subItems!.length}
                                            {#if comp.bestOf}· best {comp.bestOf}{/if}
                                        </span>
                                    {/if}
                                    <span class="edit-hint">✏</span>
                                </button>
                            {/if}
                        </div>

                        <!-- Weight -->
                        <div class="comp-cell weight-cell">
                            <input
                                class="num-input mono"
                                type="number"
                                min="0"
                                max="100"
                                step="1"
                                value={comp.weight}
                                oninput={(e) =>
                                    handleWeight(
                                        comp.id,
                                        (e.target as HTMLInputElement).value,
                                    )}
                            />
                            <span class="unit mono">%</span>
                        </div>

                        <!-- Score -->
                        <div class="comp-cell score-cell">
                            {#if !hasSubItems}
                                <input
                                    class="num-input mono score-input"
                                    type="number"
                                    min="0"
                                    max={comp.maxScore}
                                    step="0.5"
                                    placeholder="—"
                                    value={comp.score ?? ""}
                                    oninput={(e) =>
                                        handleScore(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                                <span class="unit mono">/ </span>
                                <input
                                    class="num-input mono max-input"
                                    type="number"
                                    min="1"
                                    step="1"
                                    value={comp.maxScore}
                                    oninput={(e) =>
                                        handleMax(
                                            comp.id,
                                            (e.target as HTMLInputElement)
                                                .value,
                                        )}
                                />
                            {:else}
                                <button
                                    class="sub-summary mono"
                                    onclick={() => toggle(comp.id)}
                                >
                                    {isOpen ? "▾" : "▸"}
                                    {comp.subItems!.filter(
                                        (s) => s.score !== null,
                                    ).length} of {comp.subItems!.length} entered
                                </button>
                            {/if}
                        </div>

                        <!-- Pct + bar -->
                        <div class="comp-cell pct-cell">
                            {#if pct !== null}
                                <div class="bar-stack">
                                    <div class="bar-track">
                                        <div
                                            class="bar-fill"
                                            style="width: {Math.min(
                                                pct,
                                                100,
                                            )}%; background: {barColor}"
                                        ></div>
                                    </div>
                                    <span
                                        class="mono text-xs"
                                        style="color: {barColor}"
                                        >{pct.toFixed(1)}%</span
                                    >
                                </div>
                            {:else}
                                <span class="mono text-xs dimmed">—</span>
                            {/if}
                        </div>

                        <!-- Contribution -->
                        <div
                            class="comp-cell contrib-cell mono text-xs"
                            style="color: {contrib !== null
                                ? barColor
                                : 'oklch(0.35 0.02 265)'}"
                        >
                            {contrib !== null ? contrib.toFixed(2) + "%" : "—"}
                        </div>

                        <!-- Remove -->
                        <button
                            class="remove-btn"
                            onclick={() =>
                                grades.removeComponent(data.courseId, comp.id)}
                            title="remove">×</button
                        >
                    </div>

                    <!-- Sub-items panel -->
                    {#if hasSubItems && isOpen}
                        <div class="sub-panel">
                            <div class="best-of-row mono">
                                <span class="dimmed">scoring:</span>
                                {#if comp.bestOf !== undefined}
                                    best
                                    <input
                                        class="bestof-input mono"
                                        type="number"
                                        min="1"
                                        max={comp.subItems!.length}
                                        value={comp.bestOf}
                                        oninput={(e) =>
                                            handleBestOf(
                                                comp.id,
                                                (e.target as HTMLInputElement)
                                                    .value,
                                                comp.subItems!.length,
                                            )}
                                    />
                                    of {comp.subItems!.length}
                                    <button
                                        class="pill-btn mono"
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                undefined,
                                            )}>→ use all</button
                                    >
                                {:else}
                                    average of all {comp.subItems!.length}
                                    <button
                                        class="pill-btn mono"
                                        onclick={() =>
                                            grades.updateBestOf(
                                                data.courseId,
                                                comp.id,
                                                Math.max(
                                                    1,
                                                    comp.subItems!.length - 1,
                                                ),
                                            )}>→ set best-of</button
                                    >
                                {/if}
                                <span class="dimmed" style="margin-left: auto;"
                                    >each worth {comp.subItems!.length > 0
                                        ? (
                                              comp.weight /
                                              comp.subItems!.length
                                          ).toFixed(1)
                                        : "0"}%</span
                                >
                            </div>

                            {#each comp.subItems! as sub (sub.id)}
                                {@const subPct =
                                    sub.score !== null
                                        ? (sub.score / sub.maxScore) * 100
                                        : null}
                                {@const subColor = getGradeColor(subPct)}
                                <div class="sub-row">
                                    <div class="sub-name-cell">
                                        {#if editingSubName === sub.id}
                                            <input
                                                class="name-input mono"
                                                value={sub.name}
                                                onblur={(e) => {
                                                    grades.updateSubName(
                                                        data.courseId,
                                                        comp.id,
                                                        sub.id,
                                                        (
                                                            e.target as HTMLInputElement
                                                        ).value,
                                                    );
                                                    editingSubName = null;
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
                                                class="name-display mono small"
                                                onclick={() =>
                                                    (editingSubName = sub.id)}
                                            >
                                                {sub.name}<span
                                                    class="edit-hint">✏</span
                                                >
                                            </button>
                                        {/if}
                                    </div>

                                    <div class="sub-score-cell">
                                        <input
                                            class="num-input mono score-input"
                                            type="number"
                                            min="0"
                                            max={sub.maxScore}
                                            step="0.5"
                                            placeholder="—"
                                            value={sub.score ?? ""}
                                            oninput={(e) =>
                                                handleSubScore(
                                                    comp.id,
                                                    sub.id,
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                )}
                                        />
                                        <span class="unit mono">/ </span>
                                        <input
                                            class="num-input mono max-input"
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={sub.maxScore}
                                            oninput={(e) =>
                                                handleSubMax(
                                                    comp.id,
                                                    sub.id,
                                                    (
                                                        e.target as HTMLInputElement
                                                    ).value,
                                                )}
                                        />
                                    </div>

                                    <div class="sub-pct-cell">
                                        {#if subPct !== null}
                                            <span
                                                class="mono text-xs"
                                                style="color: {subColor}"
                                                >{subPct.toFixed(1)}%</span
                                            >
                                        {:else}
                                            <span class="dimmed mono text-xs"
                                                >—</span
                                            >
                                        {/if}
                                    </div>

                                    <button
                                        class="remove-btn small"
                                        onclick={() =>
                                            grades.removeSubItem(
                                                data.courseId,
                                                comp.id,
                                                sub.id,
                                            )}
                                        title="remove">×</button
                                    >
                                </div>
                            {/each}

                            <button
                                class="add-sub-btn mono"
                                onclick={() =>
                                    grades.addSubItem(data.courseId, comp.id)}
                            >
                                + add {comp.name.toLowerCase()}
                            </button>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>

        <div class="totals mono">
            <span
                >total weight: <strong
                    style="color: {totalWeight === 100 ? '#4ade80' : '#fb923c'}"
                    >{totalWeight}%</strong
                ></span
            >
            {#if proj.grade !== null}
                <span
                    >projected total: <strong
                        style="color: {getGradeColor(proj.grade)}"
                        >{((proj.grade * totalWeight) / 100).toFixed(
                            2,
                        )}%</strong
                    ></span
                >
            {/if}
        </div>

        <button
            class="add-full-btn mono"
            onclick={() => grades.addComponent(data.courseId)}
            >+ add component</button
        >
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

    /* Hero */
    .hero {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 2rem;
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

    /* Component list */
    .comp-list {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
    }
    .comp-card {
        background: oklch(0.12 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 8px;
        overflow: hidden;
        transition: border-color 0.15s;
    }
    .comp-card.expanded {
        border-color: oklch(1 0 0 / 14%);
    }

    .comp-row {
        display: grid;
        grid-template-columns: 28px 1fr 100px 180px 140px 70px 32px;
        align-items: center;
        gap: 0.5rem;
        padding: 0.65rem 0.75rem;
        min-height: 52px;
    }

    /* Expand button */
    .expand-btn {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
    }
    .expand-btn.has-sub {
        cursor: pointer;
    }
    .chevron {
        font-size: 1.1rem;
        color: oklch(0.45 0.02 265);
        display: inline-block;
        transition:
            transform 0.2s,
            color 0.15s;
        line-height: 1;
    }
    .chevron.open {
        transform: rotate(90deg);
        color: oklch(0.7 0.02 265);
    }
    .plus-expand {
        font-size: 0.95rem;
        color: oklch(0.3 0.02 265);
        display: inline-block;
        transition: color 0.15s;
        line-height: 1;
    }
    .expand-btn:hover .plus-expand {
        color: #4ade80;
    }

    /* Name */
    .comp-name-cell {
        overflow: hidden;
    }
    .name-display {
        background: none;
        border: none;
        color: oklch(0.85 0.01 265);
        font-size: 0.8rem;
        font-family: "JetBrains Mono", monospace;
        cursor: pointer;
        padding: 0.15rem 0.35rem;
        border-radius: 4px;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        transition: background 0.1s;
        max-width: 100%;
    }
    .name-display.small {
        font-size: 0.72rem;
        color: oklch(0.75 0.01 265);
    }
    .name-display:hover {
        background: oklch(1 0 0 / 6%);
    }
    .sub-count {
        font-size: 0.6rem;
        color: oklch(0.45 0.02 265);
        padding: 0.1rem 0.35rem;
        background: oklch(1 0 0 / 6%);
        border-radius: 10px;
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
        width: 95%;
        outline: none;
    }
    .name-input:focus {
        border-color: #22d3ee60;
    }

    /* Cells */
    .comp-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }
    .weight-cell {
        justify-content: flex-end;
    }
    .score-cell {
        justify-content: flex-end;
    }
    .pct-cell {
        justify-content: flex-end;
    }
    .contrib-cell {
        justify-content: flex-end;
    }

    .num-input {
        background: oklch(1 0 0 / 5%);
        border: 1px solid oklch(1 0 0 / 10%);
        border-radius: 4px;
        color: oklch(0.85 0.01 265);
        font-size: 0.75rem;
        padding: 0.2rem 0.35rem;
        width: 56px;
        text-align: right;
        outline: none;
        transition: border-color 0.15s;
    }
    .num-input:focus {
        border-color: #22d3ee50;
    }
    .num-input::-webkit-outer-spin-button,
    .num-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .num-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .score-input {
        border-color: #22d3ee25;
        color: #22d3ee;
    }
    .score-input:focus {
        border-color: #22d3ee80;
    }
    .max-input {
        width: 46px;
    }
    .unit {
        font-size: 0.7rem;
        color: oklch(0.4 0.02 265);
    }
    .sub-summary {
        font-size: 0.7rem;
        color: oklch(0.5 0.02 265);
        background: none;
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 4px;
        padding: 0.2rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .sub-summary:hover {
        border-color: oklch(1 0 0 / 18%);
        color: oklch(0.7 0.02 265);
    }
    .bar-stack {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.2rem;
        width: 100%;
    }
    .bar-track {
        width: 100%;
        height: 3px;
        background: oklch(1 0 0 / 6%);
        border-radius: 2px;
        overflow: hidden;
    }
    .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.35s ease;
    }
    .dimmed {
        color: oklch(0.35 0.02 265);
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
    .remove-btn.small {
        font-size: 0.85rem;
    }

    /* Sub-items panel */
    .sub-panel {
        border-top: 1px solid oklch(1 0 0 / 7%);
        padding: 0.5rem 0.75rem 0.75rem 2.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
        background: oklch(0.1 0.02 265);
    }
    .best-of-row {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.7rem;
        color: oklch(0.65 0.02 265);
        padding: 0.4rem 0;
        border-bottom: 1px solid oklch(1 0 0 / 6%);
        margin-bottom: 0.25rem;
    }
    .bestof-input {
        width: 40px;
        padding: 0.1rem 0.25rem;
        font-size: 0.7rem;
        background: oklch(1 0 0 / 8%);
        border: 1px solid oklch(1 0 0 / 15%);
        border-radius: 4px;
        color: #fbbf24;
        text-align: center;
        outline: none;
    }
    .bestof-input::-webkit-outer-spin-button,
    .bestof-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
    }
    .bestof-input[type="number"] {
        -moz-appearance: textfield;
        appearance: textfield;
    }
    .pill-btn {
        background: oklch(1 0 0 / 6%);
        border: 1px solid oklch(1 0 0 / 12%);
        border-radius: 10px;
        color: oklch(0.6 0.02 265);
        font-size: 0.65rem;
        padding: 0.1rem 0.5rem;
        cursor: pointer;
        transition: all 0.15s;
    }
    .pill-btn:hover {
        background: oklch(1 0 0 / 12%);
        color: oklch(0.85 0.01 265);
    }
    .sub-row {
        display: grid;
        grid-template-columns: 1fr 200px 70px 28px;
        align-items: center;
        gap: 0.5rem;
        padding: 0.3rem 0.25rem;
        border-radius: 5px;
        transition: background 0.1s;
    }
    .sub-row:hover {
        background: oklch(1 0 0 / 3%);
    }
    .sub-name-cell {
        overflow: hidden;
    }
    .sub-score-cell {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        justify-content: flex-end;
    }
    .sub-pct-cell {
        text-align: right;
    }
    .add-sub-btn {
        margin-top: 0.35rem;
        padding: 0.4rem;
        background: none;
        border: 1px dashed oklch(1 0 0 / 10%);
        border-radius: 6px;
        color: oklch(0.45 0.02 265);
        font-size: 0.7rem;
        cursor: pointer;
        text-align: left;
        transition: all 0.15s;
    }
    .add-sub-btn:hover {
        border-color: #4ade8030;
        color: #4ade80;
        background: #4ade8008;
    }

    /* Totals */
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
