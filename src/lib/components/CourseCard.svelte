<script lang="ts">
    import { grades, computeCompPct } from "$lib/stores/grades.svelte";
    import { getGradeColor, getLetterGrade } from "$lib/grading";
    import type { Course } from "$lib/types";

    interface Props {
        course: Course;
    }
    let { course }: Props = $props();

    const proj = $derived(grades.projectedGrade(course.id));
    const totalWeight = $derived(grades.totalWeight(course.id));
    const gradeColor = $derived(getGradeColor(proj.grade));
    const letter = $derived(getLetterGrade(proj.grade));
</script>

<a href="/course/{course.id}" class="course-card group block">
    <div class="card-inner" style="--accent: {course.color}">
        <!-- Header -->
        <div class="card-header">
            <div
                class="course-tag mono"
                style="color: {course.color}; border-color: {course.color}40"
            >
                {course.name}
            </div>
            <div class="grade-badge" style="--g-color: {gradeColor}">
                <span class="letter mono">{letter}</span>
            </div>
        </div>

        <div class="full-name">{course.fullName}</div>

        <!-- Projected grade display -->
        <div class="grade-display">
            {#if proj.grade !== null}
                <span class="grade-num mono" style="color: {gradeColor}"
                    >{proj.grade.toFixed(1)}</span
                >
                <span class="grade-suffix">%</span>
            {:else}
                <span class="grade-empty mono">no scores yet</span>
            {/if}
        </div>

        <!-- Component bars -->
        <div class="bars">
            {#each course.components as comp}
                {@const pct = computeCompPct(comp)}
                {@const barColor = getGradeColor(pct)}
                <div class="bar-row">
                    <div class="bar-label mono">{comp.name}</div>
                    <div class="bar-track">
                        <div
                            class="bar-fill"
                            style="width: {pct ?? 0}%; background: {pct !== null
                                ? barColor
                                : 'transparent'}; border: 1px solid {pct !==
                            null
                                ? barColor + '60'
                                : '#ffffff15'}"
                        ></div>
                    </div>
                    <div class="bar-weight mono">{comp.weight}%</div>
                </div>
            {/each}
        </div>

        <!-- Footer -->
        <div class="card-footer">
            <span class="mono text-xs" style="color: {course.color}60">
                {proj.filled}/{proj.total} graded
            </span>
            {#if totalWeight !== 100}
                <span class="mono text-xs" style="color: #fb923c"
                    >⚠ {totalWeight}% total</span
                >
            {/if}
        </div>
    </div>
</a>

<style>
    .course-card {
        text-decoration: none;
        display: block;
    }

    .card-inner {
        background: oklch(0.13 0.025 265);
        border: 1px solid oklch(1 0 0 / 8%);
        border-radius: 10px;
        padding: 1.25rem;
        display: flex;
        flex-direction: column;
        gap: 0.8rem;
        height: 100%;
        position: relative;
        overflow: hidden;
        transition:
            border-color 0.2s,
            transform 0.15s,
            box-shadow 0.2s;
        cursor: pointer;
    }

    .card-inner::before {
        content: "";
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(
            90deg,
            transparent,
            var(--accent, #6b7280) 50%,
            transparent
        );
        opacity: 0.6;
    }

    .course-card:hover .card-inner {
        border-color: color-mix(
            in oklch,
            var(--accent, #6b7280) 40%,
            transparent
        );
        transform: translateY(-2px);
        box-shadow: 0 8px 32px oklch(0 0 0 / 30%);
    }

    .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
    }

    .course-tag {
        font-size: 0.7rem;
        font-weight: 700;
        letter-spacing: 0.1em;
        text-transform: uppercase;
        border: 1px solid;
        border-radius: 4px;
        padding: 0.15rem 0.5rem;
    }

    .grade-badge {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: color-mix(in oklch, var(--g-color) 15%, transparent);
        border: 1px solid color-mix(in oklch, var(--g-color) 40%, transparent);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .letter {
        font-size: 1rem;
        font-weight: 700;
        color: var(--g-color);
    }

    .full-name {
        font-size: 0.75rem;
        color: oklch(0.6 0.02 265);
        line-height: 1.3;
    }

    .grade-display {
        display: flex;
        align-items: baseline;
        gap: 0.25rem;
    }

    .grade-num {
        font-size: 1.75rem;
        font-weight: 700;
        line-height: 1;
        letter-spacing: -0.02em;
    }

    .grade-suffix {
        font-size: 0.875rem;
        color: oklch(0.6 0.02 265);
    }

    .grade-empty {
        font-size: 0.75rem;
        color: oklch(0.45 0.02 265);
    }

    .bars {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
    }

    .bar-row {
        display: grid;
        grid-template-columns: 1fr 80px 32px;
        align-items: center;
        gap: 0.5rem;
    }

    .bar-label {
        font-size: 0.65rem;
        color: oklch(0.55 0.02 265);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .bar-track {
        height: 4px;
        background: oklch(1 0 0 / 6%);
        border-radius: 2px;
        overflow: hidden;
        position: relative;
    }

    .bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.4s ease;
    }

    .bar-weight {
        font-size: 0.6rem;
        color: oklch(0.45 0.02 265);
        text-align: right;
    }

    .card-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: auto;
        padding-top: 0.5rem;
        border-top: 1px solid oklch(1 0 0 / 6%);
    }
</style>
