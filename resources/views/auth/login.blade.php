@extends('layouts.app')
@section('title', 'Sign in')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Sign in</h1>
  <p class="au-lead">Sign in to keep your progress across devices. No password: we email you a one-time link.</p>

  @if (session('status'))<p class="au-ok" role="status">{{ session('status') }}</p>@endif
  @isset($linkError)<p class="au-err" role="alert">{{ $linkError }}</p>@endisset
  @isset($throttled)<p class="au-err" role="alert">{{ $throttled }}</p>@endisset

  <form method="POST" action="{{ route('login.send') }}" class="au-form" novalidate>
    @csrf
    <label for="au-email">Email</label>
    <input id="au-email" name="email" type="email" autocomplete="email" inputmode="email" required
           value="{{ old('email', $oldEmail ?? '') }}" @error('email') aria-invalid="true" aria-describedby="au-email-err" @enderror>
    @error('email')<p class="au-err" id="au-email-err">{{ $message }}</p>@enderror
    <button type="submit" class="au-btn au-primary">Email me a sign-in link</button>
  </form>

  @if ($google)
    <div class="au-or"><span>or</span></div>
    <a class="au-btn" href="{{ route('auth.google') }}">Continue with Google</a>
  @endif

  <p class="au-note">Not signing in is fine: everything keeps working on this device.</p>
</section>
@endsection
