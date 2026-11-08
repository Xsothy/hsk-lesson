@extends('layouts.app')
@section('title', 'Chinese name helper')
@push('head')<link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
<div class="tool" data-tool="name" data-url="{{ url('/tools/name') }}">
  <a class="back" href="{{ route('tools') }}">‹ Tools</a>
  <h1>Chinese name helper</h1>
  <p class="tool-note">For fun only: a sound-alike name, not an official or traditional one. Real Chinese names are chosen with care for meaning, family and tone.</p>
  <label class="tool-label" for="nm-in">Your English name</label>
  <div class="tool-row">
    <input id="nm-in" class="tool-field" type="text" maxlength="60" autocomplete="off" placeholder="e.g. Emma">
    <button type="button" class="btn btn-primary" data-run>Suggest</button>
  </div>
  <section data-result hidden>
    <h2>Sound-alike name</h2>
    <p class="name-big zh" data-name lang="zh"></p>
    <p class="muted" data-pinyin></p>
    <p class="muted">Tap a syllable to try another character.</p>
    <div class="name-syl" data-syl></div>
  </section>
  <section>
    <h2>Pick by meaning</h2>
    <p class="muted">Characters with a positive meaning. Tap one to add it to your name.</p>
    <div class="tool-chips" role="group" aria-label="Meaning">
      @foreach ($themes as $t)<button type="button" class="chip-btn" data-theme="{{ $t }}" aria-pressed="false">{{ $t }}</button>@endforeach
    </div>
    <div class="name-chars" data-chars></div>
    <p class="muted">Your picks:</p>
    <p class="name-big zh" data-picks lang="zh">—</p>
    <button type="button" class="btn" data-clear>Clear picks</button>
  </section>
</div>
@endsection
@push('scripts')<script src="/js/tools.js"></script>@endpush
