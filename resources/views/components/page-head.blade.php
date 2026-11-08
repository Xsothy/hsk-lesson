{{-- One page-header pattern (R4): eyebrow + h1 + optional Chinese title line + optional subtitle. lead: decorative emoji/badge on the left. --}}
@props(['title', 'eyebrow' => null, 'zh' => null, 'sub' => null, 'lead' => null])
<header {{ $attributes->merge(['class' => 'page-head'.($lead ? ' has-lead' : '')]) }}>
  @if ($lead)<span class="ph-lead" aria-hidden="true">{{ $lead }}</span>@endif
  <div class="ph-text">
    @if ($eyebrow)<span class="eyebrow">{{ $eyebrow }}</span>@endif
    <h1>{{ $title }}@if ($zh)<span class="ph-zh" lang="zh-Hans">{{ $zh }}</span>@endif</h1>
    @if ($sub)<p class="ph-sub">{{ $sub }}</p>@endif
    {{ $slot }}
  </div>
</header>
