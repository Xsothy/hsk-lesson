<?php

namespace App\Mail;

use App\Models\LoginToken;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

class MagicLinkMail extends Mailable
{
    public function __construct(public string $url) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: 'Your sign-in link for 汉字课堂');
    }

    public function content(): Content
    {
        return new Content(text: 'mail.magic-link', with: ['url' => $this->url, 'minutes' => LoginToken::TTL_MINUTES]);
    }
}
