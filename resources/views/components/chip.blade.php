@props(['href' => null, 'active' => false, 'tone' => 'neutral', 'button' => false])
@php $cls = 'chip chip-'.$tone.($active ? ' is-active' : ''); @endphp
@if ($href)
<a href="{{ $href }}" {{ $attributes->merge(['class' => $cls]) }} @if($active) aria-current="true" @endif>{{ $slot }}</a>
@elseif ($button)
<button type="button" {{ $attributes->merge(['class' => $cls]) }} aria-pressed="{{ $active ? 'true' : 'false' }}">{{ $slot }}</button>
@else
<span {{ $attributes->merge(['class' => $cls]) }}>{{ $slot }}</span>
@endif
