@props(['href' => null, 'active' => false, 'tone' => 'neutral'])
@php $cls = 'chip chip-'.$tone.($active ? ' is-active' : ''); @endphp
@if ($href)
<a href="{{ $href }}" {{ $attributes->merge(['class' => $cls]) }} @if($active) aria-current="true" @endif>{{ $slot }}</a>
@else
<span {{ $attributes->merge(['class' => $cls]) }}>{{ $slot }}</span>
@endif
