{{-- progress: 0-100 ; state: default|current|locked --}}
@props(['n', 'title', 'sub' => null, 'progress' => 0, 'href' => '#', 'state' => 'default'])
@php $pct = max(0, min(100, (int) $progress)); @endphp
<a href="{{ $href }}" {{ $attributes->merge(['class' => 'lesson-card lc-'.$state]) }} @if($state === 'current') aria-current="step" @endif>
  <span class="lc-n">{{ $n }}</span>
  <span class="lc-title">{{ $title }}</span>
  @if ($sub)<span class="lc-sub">{{ $sub }}</span>@endif
  <span class="lc-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="{{ $pct }}" aria-label="Progress"><i style="width:{{ $pct }}%"></i></span>
</a>
