{{-- Pinyin is tone-coloured per syllable. Props: c (hanzi), p (pinyin), m (meaning), tone 1-4|null, dot none|new|learning|known, variant default|compact, large, href --}}
@props(['c', 'p' => null, 'm' => null, 'tone' => null, 'dot' => 'none', 'variant' => 'default', 'large' => false, 'href' => null])
@php
$tag = $href ? 'a' : 'div';
$len = mb_strlen((string) $c);
$cls = 'char-tile char-tile-'.$variant.($large ? ' is-large' : '').($tone ? ' tone-'.(int) $tone : '').($len >= 3 ? ' ct-len-'.min($len, 4) : '');
$dotLabel = ['new' => 'New', 'learning' => 'Learning', 'known' => 'Known'][$dot] ?? null;
@endphp
<{{ $tag }} @if($href) href="{{ $href }}" @endif {{ $attributes->merge(['class' => $cls]) }}>
  @if ($dotLabel)<span class="dot dot-{{ $dot }}" role="img" aria-label="{{ $dotLabel }}"></span>@endif
  <span class="ct-c zh">{{ $c }}</span>
  @if ($p)<span class="ct-p">{!! \App\Support\Pinyin::toneHtml($p, $c) !!}</span>@endif
  @if ($m && $variant !== 'compact')<span class="ct-m">{{ $m }}</span>@endif
</{{ $tag }}>
