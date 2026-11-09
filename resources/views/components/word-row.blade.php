{{-- Canvas "WordRow": hanzi (links to its character page when href is set) · pinyin · meaning · meta · tag · play button.
     $word: array/object with hanzi, pinyin, english [, tone, meta] ; audio: show the play button ; tag: optional small label (e.g. "HSK 1") --}}
@props(['word', 'audio' => true, 'href' => null, 'tag' => null])
@php $w = (object) $word; @endphp
<div {{ $attributes->merge(['class' => 'word-row']) }}>
  @if ($href)<a class="wr-zh zh" href="{{ $href }}" lang="zh-Hans">{{ $w->hanzi }}</a>@else<span class="wr-zh zh" lang="zh-Hans">{{ $w->hanzi }}</span>@endif
  <span class="wr-py @if(!empty($w->tone)) tone-{{ (int) $w->tone }} @endif">{!! \App\Support\Pinyin::toneHtml($w->pinyin, $w->hanzi) !!}</span>
  <span class="wr-en">{{ $w->english }}</span>
  @if (!empty($w->meta))<span class="wr-meta">{{ $w->meta }}</span>@endif
  @if ($tag)<span class="wr-tag">{{ $tag }}</span>@endif
  @if ($audio)
    <button type="button" class="wr-audio" data-say="{{ $w->hanzi }}" aria-label="Play {{ $w->hanzi }}"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z"/></svg></button>
  @endif
</div>
