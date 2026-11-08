{{-- side: left|right ; speaker: A/B name ; zh, en ; tokens (RubyTokens, interlinear pinyin) or legacy pinyin string --}}
@props(['speaker' => null, 'zh', 'pinyin' => null, 'tokens' => null, 'en' => null, 'side' => 'left'])
<div {{ $attributes->merge(['class' => 'bubble bubble-'.($side === 'right' ? 'right' : 'left')]) }}>
  @if ($speaker)<span class="b-spk" aria-hidden="true">{{ $speaker }}</span>@endif
  <div class="b-body">
    @if ($tokens)
      <x-ruby-line class="b-zh" :tokens="$tokens" />
    @else
      <div class="b-zh zh">{{ $zh }}</div>
      @if ($pinyin)<div class="b-py">{{ $pinyin }}</div>@endif
    @endif
    @if ($en)<div class="b-en">{{ $en }}</div>@endif
  </div>
  <button type="button" class="icon-btn b-audio" data-say="{{ $zh }}" aria-label="Play line"><x-icon name="audio" :size="20" /></button>
</div>
