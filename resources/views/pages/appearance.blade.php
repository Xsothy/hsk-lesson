@extends('layouts.app')
@section('title', 'Appearance')
@push('head')<link rel="stylesheet" href="/css/appearance.css">@endpush
@section('content')
<nav class="ap-crumb" aria-label="Breadcrumb"><a href="{{ route('settings') }}">Settings</a> / Appearance</nav>
<x-page-head title="Appearance" sub="Start from a preset, then adjust anything. Changes apply to the whole app on this device, and sync when you're signed in." />

<div class="ap-layout">
  <div class="ap-controls">
    <section class="ap-group" aria-labelledby="ap-presets-h">
      <h2 class="ap-lbl" id="ap-presets-h">Presets</h2>
      <div class="ap-presets" data-ap="presets"></div>
    </section>

    <section class="ap-card">
      <div class="ap-group">
        <h2 class="ap-lbl" id="ap-mode-h">Mode</h2>
        <div class="ap-mode" role="group" aria-labelledby="ap-mode-h" data-ap="modes"></div>
      </div>
      <div class="ap-group">
        <h2 class="ap-lbl" id="ap-base-h">Base colour</h2>
        <div class="ap-bases" role="group" aria-labelledby="ap-base-h" data-ap="bases"></div>
      </div>
      <div class="ap-group">
        <h2 class="ap-lbl" id="ap-accent-h">Accent</h2>
        <div class="ap-accents" role="group" aria-labelledby="ap-accent-h" data-ap="accents"></div>
      </div>
      <div class="ap-group">
        <h2 class="ap-lbl" id="ap-radius-h">Corner radius</h2>
        <div class="ap-radii" role="group" aria-labelledby="ap-radius-h" data-ap="radii"></div>
      </div>
      <div data-ap="fonts"></div>
    </section>

    <div class="ap-actions">
      <button type="button" class="ap-btn" data-ap="reset">Reset to Paper</button>
      <button type="button" class="ap-btn" data-ap="code" aria-expanded="false" aria-controls="ap-css">Show theme CSS</button>
    </div>
    <pre class="ap-css" id="ap-css" hidden></pre>
    <noscript><p class="ap-note">Appearance needs JavaScript.</p></noscript>
  </div>

  <aside class="ap-preview" aria-label="Preview">
    <h2 class="ap-lbl">Preview · <span data-ap="mode-name">Light</span></h2>
    <div class="ap-pv">
      <div class="ap-pv-bar">
        <b class="ap-pv-logo zh" lang="zh-Hans">汉字<span>课堂</span></b>
        <span class="ap-pv-pill is-on">Learn</span><span class="ap-pv-pill">Practice</span>
      </div>
      <div class="ap-pv-card ap-pv-char">
        <div>
          <span class="ap-pv-py">xué</span>
          <span class="ap-pv-zh zh" lang="zh-Hans">学</span>
          <span class="ap-pv-en">to study, to learn</span>
        </div>
        <div class="ap-pv-grid zh" lang="zh-Hans" aria-hidden="true">学</div>
      </div>
      <div class="ap-pv-card">
        <h3>Lesson 3 · At school</h3>
        <p><span class="zh" lang="zh-Hans">我在学校<b>学</b>中文。</span> I study Chinese at school.</p>
        <div class="ap-pv-bar-track"><i></i></div>
        <div class="ap-pv-opts"><span class="is-on">to study</span><span>to write</span></div>
        <div class="ap-pv-btns"><span class="is-primary">Continue</span><span>Review</span></div>
      </div>
    </div>
  </aside>
</div>
@endsection
@push('scripts')
<script src="/js/store.js"></script>
<script src="/js/appearance-page.js"></script>
@endpush
