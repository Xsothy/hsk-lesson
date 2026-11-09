@extends('layouts.app')
@section('title', 'Settings')
@push('head')<link rel="stylesheet" href="/css/settings.css">@endpush
@section('content')
<div class="st">
<h1 class="st-h1">Settings</h1>
<div class="st-grid">
  <section class="st-card" aria-labelledby="st-display">
    <h2 class="st-lbl" id="st-display">DISPLAY</h2>
    <label class="st-row st-line">
      <span class="st-txt"><span>Show pinyin</span><small>Above characters in lessons and readings</small></span>
      <input type="checkbox" class="st-check" data-check="pinyin" data-on="show" data-off="hide">
    </label>
    <label class="st-row st-line">
      <span>Pinyin below characters</span>
      <input type="checkbox" class="st-check" data-check="pinyinPos" data-on="below" data-off="above" name="pinyinPos">
    </label>
    <label class="st-row st-line">
      <span>Tone colours</span>
      <input type="checkbox" class="st-check" data-check="toneColors" data-on="1" data-off="0">
    </label>
    <div class="st-slide st-line">
      <label for="st-size">Character size <output id="st-size-out" for="st-size">1.0×</output></label>
      <input id="st-size" type="range" min="0" max="2" step="1" aria-valuetext="Medium">
    </div>
    <a class="st-app" href="{{ route('appearance') }}" data-appearance-link>
      <span class="st-dots" aria-hidden="true"><i class="d1"></i><i class="d2"></i><i class="d3"></i></span>
      <span class="st-txt"><span>Theme &amp; appearance</span><small id="st-theme-sum">Paper · presets, colors, fonts, light / dark</small></span>
      <x-icon name="chevron-right" />
    </a>
  </section>

  <section class="st-card" aria-labelledby="st-audio">
    <h2 class="st-lbl" id="st-audio">AUDIO</h2>
    <div class="st-slide st-line">
      <label for="st-rate">Speech rate <output id="st-rate-out" for="st-rate"></output></label>
      <input id="st-rate" type="range" min="0.5" max="1.5" step="0.1">
    </div>
    <div class="st-slide">
      <label for="st-voice">Voice</label>
      <div class="st-voice"><select id="st-voice" class="st-sel"><option value="">Automatic (best Chinese voice)</option></select><button type="button" class="st-test" id="st-test">Test</button></div>
      <p class="st-note" id="st-voice-note" hidden>No voices found on this device. Audio falls back to online speech.</p>
    </div>

    <h2 class="st-lbl" id="st-study">STUDY</h2>
    <label class="st-row st-line">
      <span class="st-txt"><span>HSK version</span><small>Switches our course, HSK lists and practice between 2.0 and 3.0</small></span>
      <select id="st-hsk" class="st-sel"><option value="2.0">HSK 2.0</option><option value="3.0">HSK 3.0</option></select>
    </label>
    <label class="st-row st-line"><span>Daily writing goal</span>
      <select id="st-goal" class="st-sel">@foreach ([5, 10, 15, 20, 30, 50] as $n)<option value="{{ $n }}">{{ $n }}</option>@endforeach</select></label>
    <label class="st-row st-line"><span>Hint after missed strokes</span>
      <select id="st-hint" class="st-sel">@foreach ([1, 2, 3, 4, 5] as $n)<option value="{{ $n }}">{{ $n }}</option>@endforeach<option value="0">Never</option></select></label>
    <label class="st-row st-line"><span>Flashcards show first</span>
      <select id="st-rv-first" class="st-sel"><option value="zh">Chinese</option><option value="en">English</option><option value="audio">Audio</option></select></label>
    <label class="st-row st-line"><span>Pinyin on the card front</span>
      <select id="st-rv-pinyin" class="st-sel"><option value="off">Hidden</option><option value="on">Shown</option></select></label>
    <label class="st-row"><span>Play audio when a card is revealed</span>
      <select id="st-rv-audio" class="st-sel"><option value="on">Yes</option><option value="off">No</option></select></label>
  </section>

  <section class="st-box st-sync" aria-labelledby="st-sync-h">
    <h2 id="st-sync-h">Sync across devices <span class="chip chip-gold">beta</span></h2>
    @auth
      <p id="st-account">Signed in as <a href="{{ route('account') }}">{{ auth()->user()->email }}</a> · <span id="st-sync-status" role="status" aria-live="polite">Sync on</span></p>
      <a class="st-big" href="{{ route('account') }}">Manage account</a>
    @else
      <p>Optional. Everything works without an account; your progress is saved on this device.</p>
      <a class="st-big" href="{{ route('login') }}" id="st-signin">Sign in to sync</a>
    @endauth
  </section>

  <section class="st-box st-data" aria-labelledby="st-data">
    <h2 class="st-lbl" id="st-data">YOUR DATA</h2>
    <button type="button" class="st-big st-outline" id="st-export">Export progress (JSON)</button>
    <button type="button" class="st-big st-outline" id="st-import">Import progress</button>
    <input type="file" id="st-file" accept="application/json,.json" hidden>
    <button type="button" class="st-big st-danger" id="st-reset">Reset all progress…</button>
    <p class="st-status" id="st-status" role="status" aria-live="polite"></p>
  </section>
</div>
</div>

<dialog id="st-confirm" aria-labelledby="st-confirm-t">
  <form method="dialog">
    <h2 id="st-confirm-t">Reset all progress?</h2>
    <p>This erases your progress, saved words, review schedule and settings on this device. It cannot be undone.</p>
    <div class="st-actions">
      <button class="st-big st-outline" value="cancel" autofocus>Cancel</button>
      <button class="st-big st-fill" value="reset" id="st-confirm-ok">Reset everything</button>
    </div>
  </form>
</dialog>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/settings-page.js"></script>
@endpush
