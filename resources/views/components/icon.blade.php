{{-- Inline stroke icon set (24×24, currentColor). <x-icon name="book" /> ; size in px. Decorative unless label is given. --}}
@props(['name', 'size' => 22, 'label' => null])
@php
$paths = \App\Support\Icons::PATHS;
@endphp
@if (isset($paths[$name]))
<svg {{ $attributes->merge(['class' => 'icon icon-'.$name]) }} width="{{ $size }}" height="{{ $size }}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" @if($label) role="img" aria-label="{{ $label }}" @else aria-hidden="true" focusable="false" @endif>{!! $paths[$name] !!}</svg>
@endif
