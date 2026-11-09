{{-- Canvas "WritingGrid": framed card, red-bordered square with dashed guides, character in the middle, "Stroke n" badge.
     mode: watch|write|blank|outline ; grid: none|cross|tian|mi ; stroke: current stroke ; max: stroke count. Hanzi Writer mounts into [data-writer]. --}}
@props(['char', 'mode' => 'watch', 'grid' => 'cross', 'stroke' => 0, 'max' => 0])
<div {{ $attributes->merge(['class' => 'writing-grid wg-'.$mode.' wg-grid-'.$grid]) }} data-char="{{ $char }}" data-mode="{{ $mode }}">
  <div class="wg-box">
    @if ($grid !== 'none')<span class="wg-v" aria-hidden="true"></span><span class="wg-h" aria-hidden="true"></span>@endif
    @if ($grid === 'mi')<span class="wg-d1" aria-hidden="true"></span><span class="wg-d2" aria-hidden="true"></span>@endif
    <div class="wg-writer" data-writer role="img" aria-label="Writing area for {{ $char }}">
      @if (in_array($mode, ['watch', 'outline']))<span class="wg-ghost zh" lang="zh-Hans" aria-hidden="true">{{ $char }}</span>@endif
    </div>
    @if ($max > 0)<span class="wg-count" aria-live="polite" @if((int) $stroke < 1) hidden @endif>Stroke {{ (int) $stroke }}</span>@endif
  </div>
</div>
