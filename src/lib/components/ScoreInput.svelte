<script lang="ts" module>
    export type ParsedScore = { score: number | null; max?: number };

    /**
     * Parse what the user typed into a score box.
     *   ""        → cleared
     *   "23"      → 23 (out of the current max)
     *   "23/30"   → 23 out of 30 (sets the max when allowed, otherwise rescales)
     *   "80%"     → 80% of the current max
     * Returns undefined when the text can't be understood.
     */
    export function parseScore(text: string, max: number, allowMaxChange: boolean): ParsedScore | undefined {
        const t = text.trim().replace(",", ".");
        if (t === "" || t === "-" || t === "—") return { score: null };

        const pct = t.match(/^(\d+(?:\.\d+)?)\s*%$/);
        if (pct) return { score: (parseFloat(pct[1]) / 100) * max };

        const frac = t.match(/^(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)$/);
        if (frac) {
            const a = parseFloat(frac[1]);
            const b = parseFloat(frac[2]);
            if (b <= 0) return undefined;
            return allowMaxChange ? { score: a, max: b } : { score: (a / b) * max };
        }

        const num = t.match(/^\d+(?:\.\d+)?$/);
        if (num) return { score: parseFloat(t) };
        return undefined;
    }

    function fmt(n: number | null | undefined): string {
        if (n == null) return "";
        return String(Math.round(n * 100) / 100);
    }
</script>

<script lang="ts">
    import * as InputGroup from "$lib/components/ui/input-group";

    interface Props {
        id?: string;
        value: number | null | undefined;
        max: number;
        /** When true, typing "a/b" also changes the max. */
        allowMaxChange?: boolean;
        placeholder?: string;
        disabled?: boolean;
        "aria-label"?: string;
        class?: string;
        onCommit: (parsed: ParsedScore) => void;
    }
    let {
        id,
        value,
        max,
        allowMaxChange = false,
        placeholder = "—",
        disabled = false,
        "aria-label": ariaLabel,
        class: className,
        onCommit,
    }: Props = $props();

    let text = $state("");
    let focused = $state(false);
    let invalid = $state(false);

    // Mirror the stored value whenever the user isn't typing.
    $effect(() => {
        const v = fmt(value);
        if (!focused) text = v;
    });

    function commit() {
        const parsed = parseScore(text, max, allowMaxChange);
        if (!parsed) {
            invalid = true;
            return;
        }
        invalid = false;
        const unchanged = parsed.score === (value ?? null) && (parsed.max === undefined || parsed.max === max);
        if (!unchanged) onCommit(parsed);
        text = fmt(parsed.score);
    }
</script>

<InputGroup.Root class={className} data-disabled={disabled || undefined}>
    <InputGroup.Input
        {id}
        inputmode="decimal"
        autocomplete="off"
        spellcheck="false"
        class="font-mono tabular-nums"
        {placeholder}
        {disabled}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        title="Type 23, 23/30 or 80%"
        bind:value={text}
        onfocus={() => (focused = true)}
        onblur={() => {
            focused = false;
            commit();
        }}
        onkeydown={(e) => {
            if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
            if (e.key === "Escape") {
                text = fmt(value);
                invalid = false;
                (e.currentTarget as HTMLInputElement).blur();
            }
        }}
    />
    <InputGroup.Addon align="inline-end">
        <InputGroup.Text class="font-mono tabular-nums">/ {fmt(max)}</InputGroup.Text>
    </InputGroup.Addon>
</InputGroup.Root>
