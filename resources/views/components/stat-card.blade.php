{{-- Canvas "StatCard": value + label. tone: neutral|red|green|gold|blue (value colour); soft: paper background; hint: optional extra line --}}
@props(['value', 'label', 'tone' => 'neutral', 'hint' => null, 'soft' => false])
<div {{ $attributes->merge(['class' => 'stat-card stat-'.$tone.($soft ? ' is-soft' : '')]) }}>
  <b class="stat-value">{{ $value }}</b>
  <span class="stat-label">{{ $label }}</span>
  @if ($hint)<span class="stat-hint">{{ $hint }}</span>@endif
</div>
