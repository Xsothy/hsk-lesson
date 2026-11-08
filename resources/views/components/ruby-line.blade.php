{{-- Interlinear pinyin: one <ruby> per word, tone-coloured syllables; tokens from App\Services\RubyTokens.
     audio: text to speak (string), or omit/false for no button. Words with vocab open the word sheet (public/js/ruby.js). --}}
@props(['tokens' => [], 'audio' => null])
@php
  // Built as one string so no whitespace lands between words.
  $html = '';
  foreach ($tokens as $t) {
      if (empty($t['syllables'])) { $html .= e($t['zh']); continue; }
      $sep = str_contains($t['pinyin'] ?? '', ' ') ? ' ' : '';
      $rt = collect($t['syllables'])->map(fn ($s) => '<span class="tone-'.(int) $s['t'].'">'.e($s['s']).'</span>')->implode($sep);
      $ruby = '<ruby><rb>'.e($t['zh']).'</rb><rt>'.$rt.'</rt></ruby>';
      if (! empty($t['vocab'])) {
          $en = $t['vocab']['e'] ?? '';
          $ruby = '<button type="button" class="rl-word" data-word="'.e($t['zh']).'" data-py="'.e($t['pinyin']).'" data-en="'.e($en)
              .'" aria-label="'.e($t['zh'].' '.$t['pinyin'].($en !== '' ? ' — '.$en : '')).'">'.$ruby.'</button>';
      }
      $html .= $ruby;
  }
@endphp
<div {{ $attributes->merge(['class' => 'ruby-line']) }}>
  <span class="rl-text zh" lang="zh-CN">{!! $html !!}</span>
  @if ($audio)<button type="button" class="icon-btn rl-audio" data-say="{{ $audio }}" aria-label="Play line">🔊</button>@endif
</div>
@once
@push('scripts')<script src="/js/ruby.js"></script>@endpush
@endonce
