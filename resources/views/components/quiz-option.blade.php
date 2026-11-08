{{-- state: idle | selected | correct | wrong | disabled --}}
@props(['label', 'state' => 'idle', 'key' => null])
@php $s = in_array($state, ['idle','selected','correct','wrong','disabled']) ? $state : 'idle'; @endphp
<button type="button" {{ $attributes->merge(['class' => 'quiz-option qo-'.$s]) }}
  @if($s === 'disabled') disabled @endif
  aria-pressed="{{ $s === 'selected' ? 'true' : 'false' }}">
  @if ($key)<span class="qo-key" aria-hidden="true">{{ $key }}</span>@endif
  <span class="qo-label">{{ $label }}</span>
  @if ($s === 'correct')<span class="qo-mark" role="img" aria-label="Correct">✓</span>@endif
  @if ($s === 'wrong')<span class="qo-mark" role="img" aria-label="Wrong">✗</span>@endif
</button>
