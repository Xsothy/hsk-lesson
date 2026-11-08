{{-- mode: watch|write|blank ; grid: none|cross|mi ; stroke: current stroke index ; max: stroke count. Hanzi Writer mounts into [data-writer]. --}}
@props(['char', 'mode' => 'watch', 'grid' => 'cross', 'stroke' => 0, 'max' => 0])
<div {{ $attributes->merge(['class' => 'writing-grid wg-'.$mode.' wg-grid-'.$grid]) }} data-char="{{ $char }}" data-mode="{{ $mode }}">
  <svg class="wg-lines" viewBox="0 0 100 100" aria-hidden="true" preserveAspectRatio="none">
    @if ($grid !== 'none')
      <line x1="50" y1="0" x2="50" y2="100"/><line x1="0" y1="50" x2="100" y2="50"/>
    @endif
    @if ($grid === 'mi')
      <line x1="0" y1="0" x2="100" y2="100"/><line x1="100" y1="0" x2="0" y2="100"/>
    @endif
  </svg>
  <div class="wg-writer" data-writer role="img" aria-label="Writing area for {{ $char }}">
    @if ($mode === 'watch')<span class="wg-ghost zh" aria-hidden="true">{{ $char }}</span>@endif
  </div>
  @if ($max > 0)<span class="wg-count" aria-live="polite">{{ (int) $stroke }}/{{ (int) $max }}</span>@endif
</div>
