{{-- side: left|right ; speaker: A/B name ; zh, pinyin, en --}}
@props(['speaker' => null, 'zh', 'pinyin' => null, 'en' => null, 'side' => 'left'])
<div {{ $attributes->merge(['class' => 'bubble bubble-'.($side === 'right' ? 'right' : 'left')]) }}>
  @if ($speaker)<span class="b-spk" aria-hidden="true">{{ $speaker }}</span>@endif
  <div class="b-body">
    <div class="b-zh zh">{{ $zh }}</div>
    @if ($pinyin)<div class="b-py">{{ $pinyin }}</div>@endif
    @if ($en)<div class="b-en">{{ $en }}</div>@endif
  </div>
  <button type="button" class="icon-btn b-audio" data-say="{{ $zh }}" aria-label="Play line">🔊</button>
</div>
