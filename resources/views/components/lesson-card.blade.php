{{-- Canvas "LessonCard": glyph square + "Lesson n" / Chinese title / English title, then a progress bar with a Done / n% / Start label.
     n: lesson number (or a ready label like "Lesson 2"); title: English title; zh: Chinese title (a CJK `sub` is read as zh);
     glyph: tile character (defaults to the first hanzi of zh); tint: tile background token name (default green-s); progress 0-100; state: default|current|locked --}}
@props(['n', 'title', 'sub' => null, 'zh' => null, 'glyph' => null, 'tint' => null, 'progress' => 0, 'href' => '#', 'state' => 'default'])
@php
$pct = max(0, min(100, (int) $progress));
$han = fn ($s) => is_string($s) ? preg_replace('/[^\p{Han}]/u', '', $s) : '';
if ($zh === null && $han($sub) !== '') { $zh = $sub; $sub = null; }
$eyebrow = is_numeric($n) ? 'Lesson '.$n : $n;
$glyph ??= mb_substr($han($zh) ?: ($han($title) ?: (string) $title), 0, 1);
$label = $pct === 100 ? 'Done' : ($pct ? $pct.'%' : 'Start');
@endphp
<a href="{{ $href }}" {{ $attributes->merge(['class' => 'lesson-card lc-'.$state.($pct === 100 ? ' is-done' : '')]) }} @if($state === 'current') aria-current="step" @endif>
  <span class="lc-top">
    <span class="lc-glyph zh" lang="zh-Hans" aria-hidden="true" @if($tint) style="background:var(--{{ $tint }})" @endif>{{ $glyph }}</span>
    <span class="lc-text">
      <span class="lc-n">{{ $eyebrow }}</span>
      @if ($zh)<span class="lc-zh zh" lang="zh-Hans">{{ $zh }}</span>@endif
      <span class="{{ $zh ? 'lc-sub' : 'lc-title' }}">{{ $title }}</span>
      @if ($sub)<span class="lc-sub">{{ $sub }}</span>@endif
    </span>
  </span>
  <span class="lc-foot">
    <span class="lc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ $pct }}" aria-label="Progress"><i style="width:{{ $pct }}%"></i></span>
    <span class="lc-pct">{{ $label }}</span>
  </span>
</a>
