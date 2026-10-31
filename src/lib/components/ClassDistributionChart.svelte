<script lang="ts">
    import { AreaChart } from "layerchart";
    import * as Chart from "$lib/components/ui/chart";
    import { scoreToPercentile } from "$lib/curveGrading";
    import type { ClassTotalDistribution } from "$lib/stores/grades.svelte";

    interface Props {
        dist: ClassTotalDistribution;
    }
    let { dist }: Props = $props();

    const chartConfig = {
        density: { label: "Class", color: "var(--chart-1)" },
    } satisfies Chart.ChartConfig;

    // Everything is shown as a percentage of the components the estimate covers.
    const k = $derived(100 / (dist.coveredWeight || 1));
    const mean = $derived(dist.mean * k);
    const sd = $derived(Math.max(dist.sd * k, 1e-6));
    const yours = $derived(dist.yours * k);

    // Plot ±4σ around the class mean, widened to include you, clipped to 0–100%.
    const domain = $derived.by((): [number, number] => {
        const spread = Math.max(sd, 0.5);
        const lo = Math.max(0, Math.min(mean - 4 * spread, yours - 2));
        const hi = Math.min(Math.max(100, yours), Math.max(mean + 4 * spread, yours + 2));
        return [lo, hi > lo ? hi : lo + 1];
    });

    const points = $derived.by(() => {
        const [lo, hi] = domain;
        const n = 120;
        return Array.from({ length: n + 1 }, (_, i) => {
            const pct = lo + ((hi - lo) * i) / n;
            const z = (pct - mean) / sd;
            return {
                pct,
                density: Math.exp(-0.5 * z * z) / (sd * Math.sqrt(2 * Math.PI)),
                percentile: scoreToPercentile(pct, mean, sd),
            };
        });
    });
</script>

<Chart.Container config={chartConfig} class="aspect-auto h-56 w-full">
    <AreaChart
        data={points}
        x="pct"
        y="density"
        xDomain={domain}
        axis="x"
        series={[{ key: "density", label: chartConfig.density.label, color: chartConfig.density.color }]}
        annotations={[
            {
                type: "line",
                x: mean,
                props: {
                    line: { class: "stroke-muted-foreground! [stroke-dasharray:4_4]" },
                },
            },
            {
                type: "line",
                x: yours,
                label: `You ${yours.toFixed(1)}%`,
                labelPlacement: "top-right",
                labelXOffset: 4,
                props: {
                    line: { class: "stroke-foreground! stroke-2" },
                    label: { class: "fill-foreground font-medium" },
                },
            },
        ]}
        props={{
            area: { line: { class: "stroke-2" } },
            xAxis: { format: (v: number) => `${v.toFixed(0)}%` },
        }}
    >
        {#snippet tooltip({ context })}
            <Chart.Tooltip
                hideIndicator
                labelFormatter={(v) => `Scoring ${Number(v).toFixed(1)}%`}
            >
                {#snippet formatter()}
                    <span class="text-muted-foreground">
                        At or above ~{(context.tooltip.data?.percentile ?? 0).toFixed(0)}% of the class
                    </span>
                {/snippet}
            </Chart.Tooltip>
        {/snippet}
    </AreaChart>
</Chart.Container>
