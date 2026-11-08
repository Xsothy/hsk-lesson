@extends('layouts.app')
@section('title', 'Pinyin converter')
@push('head')<meta name="csrf-token" content="{{ csrf_token() }}"><link rel="stylesheet" href="/css/tools.css">@endpush
@section('content')
<div class="tool" data-tool="pinyin" data-url="{{ url('/tools/pinyin') }}">
  <a class="back" href="{{ route('tools') }}">‹ Tools</a>
  <h1>Pinyin converter</h1>
  <p class="muted">Type tone numbers (<code>xue2xi2</code>), tone marks (<code>xuéxí</code>) or Chinese characters.</p>
  <label class="tool-label" for="pin-in">Input</label>
  <textarea id="pin-in" class="tool-field" rows="4" maxlength="{{ $max }}" lang="zh" placeholder="xue2xi2 · nǐ hǎo · 你好"></textarea>
  <div class="tool-seg" role="radiogroup" aria-label="Output format">
    <label><input type="radio" name="mode" value="marks" checked><span>Tone marks</span></label>
    <label><input type="radio" name="mode" value="numbers"><span>Tone numbers</span></label>
    <label><input type="radio" name="mode" value="plain"><span>No tones</span></label>
  </div>
  <label class="tool-label" for="pin-out">Result</label>
  <output id="pin-out" class="tool-out" data-out aria-live="polite" lang="zh"></output>
  <div class="tool-actions">
    <button type="button" class="btn btn-primary" data-copy>Copy</button>
    <span class="muted" data-status role="status"></span>
  </div>
</div>
@endsection
@push('scripts')<script src="/js/tools.js"></script>@endpush
