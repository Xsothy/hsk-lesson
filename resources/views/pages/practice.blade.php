@extends('layouts.app')
@php
  $icon = [
    'hint' => '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9V16h7v-2.1A6 6 0 0 0 12 3z"/>',
    'outline' => '<rect x="4" y="4" width="16" height="16" rx="3" stroke-dasharray="3 3"/><path d="M9 9h6v6H9z"/>',
    'retry' => '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    'next' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
  ];
  $svg = fn ($k) => '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="'.($k === 'next' ? 2 : 1.9).'" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'.$icon[$k].'</svg>';
  $hasSource = ! empty($params['lesson']) || ! empty($params['version']) || ! empty($params['words']) || in_array($params['source'] ?? null, ['saved', 'due', 'list'], true);
  $src = ! empty($params['lesson']) ? 'lesson' : (! empty($params['version']) ? 'hsk'.(int) $params['version'] : ($params['source'] ?? null));
  $filter = $params['filter'] ?? null;
  $order = $params['order'] ?? null;
  $keep = array_filter(['lesson' => $params['lesson'] ?? null, 'version' => $params['version'] ?? null, 'level' => $params['level'] ?? null, 'set' => $params['set'] ?? null, 'source' => $params['source'] ?? null, 'words' => $params['words'] ?? null, 'id' => request('id'), 'mode' => $params['mode'] ?? null]);
  $sources = [];
  if ($current) {
    $sources[] = ['lesson', 'Lesson '.$current->number.' · '.$current->zh_title, $current->char_count.' characters', route('practice', ['lesson' => $current->slug]), 'hsk-v'.(($current->course ?? '2.0') === '3.0' ? 3 : 2), true];
  }
  $sources[] = ['hsk2', 'HSK 1 word list', $hskCount[2].' words · HSK 2.0', route('practice', ['version' => 2, 'level' => 1]), 'hsk-v2', false];
  $sources[] = ['hsk3', 'HSK 1 word list', $hskCount[3].' words · HSK 3.0', route('practice', ['version' => 3, 'level' => 1]), 'hsk-v3', false];
  $sources[] = ['saved', 'My saved words', '', route('practice', ['source' => 'saved']), '', false];
  $sources[] = ['due', 'Due for review', '', route('practice', ['source' => 'due']), '', false];
@endphp
@section('title', 'Practice')
@push('head')<link rel="stylesheet" href="/css/practice.css">@endpush

@section('content')
<div class="pr" data-practice @if($hasSource) data-has-source @endif data-mode="{{ ($params['mode'] ?? '') === 'dictation' ? 'dictation' : 'write' }}">
  <h1 class="pr-sr" data-title>Practice</h1>

  {{-- SESSION (first on phones) --}}
  <section class="pr-main" aria-label="Practice session">
    <div class="pr-modes" role="group" aria-label="Mode">
      <button type="button" data-set-mode="write" aria-pressed="true">Write</button>
      <button type="button" data-set-mode="dictation" aria-pressed="false">Dictation</button>
      <a href="{{ route('practice.sentences') }}">Sentence</a>
    </div>

    <p class="pr-msg" data-msg role="status" hidden></p>

    {{-- Empty state: no source chosen yet --}}
    <div class="pr-card pr-empty" data-picker @if($hasSource) hidden @endif>
      <span class="pr-empty-zh" lang="zh-Hans" aria-hidden="true">写</span>
      <h2 class="pr-h2">Choose what to practise</h2>
      <p>Pick a lesson, a word list or your own words under <b>Session</b>, then write each character stroke by stroke.</p>
    </div>

    <div class="pr-session" data-session hidden>
      <div class="pr-top">
        <span class="pr-count" data-count aria-live="polite"></span>
        <div class="pr-bar" role="progressbar" aria-label="Session progress" aria-valuemin="0" aria-valuemax="1" aria-valuenow="0"><i data-bar></i></div>
        <span class="pr-label" data-label></span>
      </div>

      <div class="pr-card">
        <div class="pr-prompt pr-prompt-write">
          <span class="pr-py" data-py></span>
          <span class="pr-en" data-en></span>
        </div>
        <div class="pr-prompt pr-prompt-dict">
          <button type="button" class="pr-audio" data-action="audio" aria-label="Play the word again"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/></svg></button>
          <span class="pr-dict-text"><b>Listen and write</b><span data-dict-hint></span></span>
        </div>
        <div class="pr-stage"><x-writing-grid char="" mode="write" grid="mi" /></div>
        <p class="pr-feedback" role="status" data-feedback></p>
        <div class="pr-controls">
          <button type="button" class="pr-ctl" data-action="hint"><span class="pr-ctl-i">{!! $svg('hint') !!}</span>Hint</button>
          <button type="button" class="pr-ctl" data-action="outline" aria-pressed="true"><span class="pr-ctl-i">{!! $svg('outline') !!}</span>Outline</button>
          <button type="button" class="pr-ctl" data-action="retry"><span class="pr-ctl-i">{!! $svg('retry') !!}</span>Retry</button>
          <button type="button" class="pr-ctl is-primary" data-action="next" aria-label="Next character"><span class="pr-ctl-i">{!! $svg('next') !!}</span><span data-next-label>Next</span></button>
        </div>
      </div>

      <div class="pr-done-row" data-done-row hidden>
        <span class="pr-done-l" id="pr-done-l">Done:</span>
        <ul class="pr-done" data-done aria-labelledby="pr-done-l"></ul>
      </div>
    </div>

    {{-- Summary --}}
    <section class="pr-summary pr-card" data-summary hidden aria-labelledby="pr-sum-h">
      <h2 id="pr-sum-h" class="pr-h2">Session complete</h2>
      <div class="pr-stats">
        <x-stat-card value="0" label="Characters written" tone="green" data-stat="done" />
        <x-stat-card value="0" label="Mistakes" tone="red" data-stat="mistakes" />
        <x-stat-card value="0%" label="Stroke accuracy" tone="gold" data-stat="accuracy" />
      </div>
      <p class="pr-note" data-skipped hidden></p>
      <div class="pr-sum-actions">
        <button type="button" class="pr-btn is-primary" data-action="again">Practise this set again</button>
        <a class="pr-btn" href="{{ route('review') }}">Review flashcards</a>
      </div>
    </section>
  </section>

  {{-- SETUP (left on desktop, after the session on phones) --}}
  <aside class="pr-setup" aria-labelledby="pr-setup-h">
    <h2 id="pr-setup-h" class="pr-setup-h">Session</h2>
    <fieldset class="pr-src">
      <legend>Practise from</legend>
      @foreach ($sources as [$key, $label, $sub, $href, $cls, $isLesson])
        <label class="pr-src-opt {{ $cls }}">
          <input type="radio" name="pr-src" value="{{ $key }}" data-href="{{ $href }}" @checked($src === $key)>
          <span class="pr-src-t"><b>{{ $label }}</b><span @if(in_array($key, ['saved', 'due'], true)) data-src-sub="{{ $key }}" @endif>{{ $sub }}</span></span>
        </label>
      @endforeach
      <label class="pr-more">
        <span>Another lesson or level</span>
        <select data-more>
          <option value="">Choose…</option>
          <optgroup label="Lessons">
            @foreach ($lessons as $l)
              <option class="hsk-v{{ ($l->course ?? '2.0') === '3.0' ? 3 : 2 }}" value="{{ route('practice', ['lesson' => $l->slug]) }}" @selected(($params['lesson'] ?? null) === $l->slug)>Lesson {{ $l->number }} · {{ $l->zh_title }}</option>
            @endforeach
          </optgroup>
          <optgroup label="HSK 2.0">
            @foreach ($levels2 as $lv)<option value="{{ route('practice', ['version' => 2, 'level' => $lv]) }}" @selected((int) ($params['version'] ?? 0) === 2 && (int) ($params['level'] ?? 0) === $lv && empty($params['set']))>HSK 2.0 · Level {{ $lv }}</option>@endforeach
          </optgroup>
          <optgroup label="HSK 3.0">
            @foreach ($levels3 as $lv)<option value="{{ route('practice', ['version' => 3, 'level' => $lv]) }}" @selected((int) ($params['version'] ?? 0) === 3 && (int) ($params['level'] ?? 0) === $lv && empty($params['set']))>HSK 3.0 · Level {{ $lv === 7 ? '7–9' : $lv }}</option>@endforeach
          </optgroup>
        </select>
      </label>
    </fieldset>
    <div class="pr-which">
      <span class="pr-which-l" id="pr-which-l">Which items</span>
      <div class="pr-seg" role="group" aria-labelledby="pr-which-l">
        <a href="{{ route('practice', $keep + ['filter' => 'learn']) }}" aria-pressed="{{ $filter === 'learn' ? 'true' : 'false' }}" role="button">To learn</a>
        <a href="{{ route('practice', $keep) }}" aria-pressed="{{ ! $filter && $order !== 'random' ? 'true' : 'false' }}" role="button">All</a>
        <a href="{{ route('practice', $keep + ['order' => 'random']) }}" aria-pressed="{{ $order === 'random' && ! $filter ? 'true' : 'false' }}" role="button">Random</a>
      </div>
    </div>
    <p class="pr-info">Unlimited and free. Progress is saved on this device; sign-in is optional for syncing.</p>
  </aside>
</div>
@endsection

@push('scripts')
<script src="/js/store.js"></script>
<script src="https://cdn.jsdelivr.net/npm/hanzi-writer@3.7.2/dist/hanzi-writer.min.js"></script>
<script src="/js/character.js"></script>
<script src="/js/practice.js"></script>
@endpush
