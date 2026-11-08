@props(['value', 'label', 'tone' => 'neutral', 'hint' => null])
<div {{ $attributes->merge(['class' => 'stat-card stat-'.$tone]) }}>
  <div class="stat-value">{{ $value }}</div>
  <div class="stat-label">{{ $label }}</div>
  @if ($hint)<div class="stat-hint">{{ $hint }}</div>@endif
</div>
