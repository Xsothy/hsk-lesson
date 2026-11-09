{{-- Canvas "QuizOption". state: idle | selected | correct | wrong | disabled.
     key: kept for callers as data-key, not shown (the canvas has no letter badge). The ✓/✕ prefix is an SVG mark. --}}
@props(['label', 'state' => 'idle', 'key' => null])
@php $s = in_array($state, ['idle','selected','correct','wrong','disabled']) ? $state : 'idle'; @endphp
<button type="button" {{ $attributes->merge(['class' => 'quiz-option qo-'.$s]) }}
  @if($key) data-key="{{ $key }}" @endif
  @if($s === 'disabled') disabled @endif
  aria-pressed="{{ $s === 'selected' ? 'true' : 'false' }}">
  @if ($s === 'correct')<span class="qo-mark" role="img" aria-label="Correct">{!! \App\Support\Icons::mark(true) !!}</span>@endif
  @if ($s === 'wrong')<span class="qo-mark" role="img" aria-label="Wrong">{!! \App\Support\Icons::mark(false) !!}</span>@endif
  <span class="qo-label">{{ $label }}</span>
</button>
