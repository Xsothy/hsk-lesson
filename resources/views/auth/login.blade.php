@extends('layouts.app')
@section('title', 'Sign in')
@push('head')<link rel="stylesheet" href="/css/auth.css">@endpush
@section('content')
@php($tg = config('hsk.support_telegram'))
<section class="au-card" aria-labelledby="au-t">
  <h1 id="au-t">Sign in</h1>
  <p class="au-lead">Sign in to keep your progress across devices.</p>

  @if (session('status'))<p class="au-ok" role="status">{{ session('status') }}</p>@endif

  <form method="POST" action="{{ route('login') }}" class="au-form" novalidate>
    @csrf
    <label for="au-email">Email</label>
    <input id="au-email" name="email" type="email" autocomplete="email" inputmode="email" required
           value="{{ old('email') }}" @error('email') aria-invalid="true" aria-describedby="au-email-err" @enderror>
    @error('email')<p class="au-err" id="au-email-err" role="alert">{{ $message }}</p>@enderror

    <label for="au-password">Password</label>
    <input id="au-password" name="password" type="password" autocomplete="current-password" required>
    @error('password')<p class="au-err" role="alert">{{ $message }}</p>@enderror

    <label class="au-check"><input type="checkbox" name="remember" value="1" checked> Keep me signed in</label>
    <button type="submit" class="au-btn au-primary">Sign in</button>
  </form>

  <p class="au-note">No account yet? <a href="{{ route('register') }}">Create one</a>.</p>
  @if ($tg)
    <p class="au-note" id="au-forgot">Forgot your password? Message us on Telegram:
      <a href="https://t.me/{{ $tg }}" target="_blank" rel="noopener">{{ '@'.$tg }}</a></p>
  @endif
  <p class="au-note">Not signing in is fine: everything keeps working on this device.</p>
</section>
@endsection
