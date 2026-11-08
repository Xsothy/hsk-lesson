{{-- variant: light|dark ; icon, title, sub, href --}}
@props(['title', 'sub' => null, 'icon' => null, 'href' => '#', 'variant' => 'light'])
<a href="{{ $href }}" {{ $attributes->merge(['class' => 'action-row action-'.$variant]) }}>
  @if ($icon)<span class="ar-icon" aria-hidden="true">{{ $icon }}</span>@endif
  <span class="ar-body"><span class="ar-title">{{ $title }}</span>@if($sub)<span class="ar-sub">{{ $sub }}</span>@endif</span>
  <span class="ar-go" aria-hidden="true">›</span>
</a>
