{{-- Canvas "ActionRow". variant: light|dark|red|gold ("dark" is the accent-tint block). glyph: a hanzi for the icon square;
     icon: an <x-icon> name (legacy emoji map to icons, other text renders as-is); cta: optional right-hand text; title, sub, href --}}
@props(['title', 'sub' => null, 'icon' => null, 'glyph' => null, 'cta' => null, 'href' => '#', 'variant' => 'light'])
@php $iconName = \App\Support\Icons::resolve($icon); @endphp
<a href="{{ $href }}" {{ $attributes->merge(['class' => 'action-row action-'.$variant]) }}>
  @if ($glyph)<span class="ar-icon zh" lang="zh-Hans" aria-hidden="true">{{ $glyph }}</span>
  @elseif ($iconName)<span class="ar-icon" aria-hidden="true"><x-icon :name="$iconName" :size="20" /></span>
  @elseif ($icon)<span class="ar-icon" aria-hidden="true">{{ $icon }}</span>@endif
  <span class="ar-body"><b class="ar-title">{{ $title }}</b>@if($sub)<span class="ar-sub">{{ $sub }}</span>@endif</span>
  @if ($cta)<span class="ar-cta">{{ $cta }}</span>@endif
</a>
