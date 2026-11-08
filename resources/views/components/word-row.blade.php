{{-- $word: array/object with hanzi, pinyin, english [, tone] ; audio: show the play button ; tag: optional small label (e.g. "HSK 1") --}}
@props(['word', 'audio' => true, 'href' => null, 'tag' => null])
@php
$w = (object) $word;
$el = $href ? 'a' : 'div';
@endphp
<{{ $el }} @if($href) href="{{ $href }}" @endif {{ $attributes->merge(['class' => 'word-row']) }}>
  <span class="wr-zh zh">{{ $w->hanzi }}</span>
  <span class="wr-body">
    <span class="wr-py @if(!empty($w->tone)) tone-{{ (int) $w->tone }} @endif">{{ $w->pinyin }}</span>
    <span class="wr-en">{{ $w->english }}</span>
  </span>
  @if ($tag)<span class="wr-tag">{{ $tag }}</span>@endif
  @if ($audio)
    <button type="button" class="icon-btn wr-audio" data-say="{{ $w->hanzi }}" aria-label="Play {{ $w->hanzi }}">🔊</button>
  @endif
</{{ $el }}>
