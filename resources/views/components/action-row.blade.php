{{-- variant: light|dark ; icon (an <x-icon> name; legacy emoji map to icons, other text renders as-is), title, sub, href --}}
@props(['title', 'sub' => null, 'icon' => null, 'href' => '#', 'variant' => 'light'])
<a href="{{ $href }}" {{ $attributes->merge(['class' => 'action-row action-'.$variant]) }}>
  @php $iconName = \App\Support\Icons::resolve($icon); @endphp
  @if ($iconName)<span class="ar-icon" aria-hidden="true"><x-icon :name="$iconName" /></span>@elseif ($icon)<span class="ar-icon" aria-hidden="true">{{ $icon }}</span>@endif
  <span class="ar-body"><span class="ar-title">{{ $title }}</span>@if($sub)<span class="ar-sub">{{ $sub }}</span>@endif</span>
  <span class="ar-go" aria-hidden="true"><x-icon name="chevron-right" :size="20" /></span>
</a>
