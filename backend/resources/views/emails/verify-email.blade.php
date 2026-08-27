<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Verify your e-KoopMart email</title>
</head>
<body style="margin:0;background:#f4f7fd;color:#0b1739;font-family:Arial,Helvetica,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7fd;padding:32px 16px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border:1px solid #dfe7f4;border-radius:16px;overflow:hidden;">
                    <tr>
                        <td style="background:#0b1739;padding:22px 28px;color:#ffffff;font-size:20px;font-weight:700;">
                            e-KoopMart
                        </td>
                    </tr>
                    <tr>
                        <td style="padding:32px 28px;">
                            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.3;">Verify your email address</h1>
                            <p style="margin:0 0 22px;color:#526078;font-size:15px;line-height:1.7;">
                                Hello {{ $user->name }}, confirm this email address to finish creating your Barbaza MPC marketplace account.
                            </p>
                            <p style="margin:0 0 24px;">
                                <a href="{{ $verificationUrl }}" style="display:inline-block;background:#2954c8;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;padding:13px 22px;border-radius:9px;">
                                    Verify email address
                                </a>
                            </p>
                            <p style="margin:0 0 12px;color:#526078;font-size:13px;line-height:1.6;">
                                This secure link expires in {{ $expiresInMinutes }} minutes. If you did not create this account, you can safely ignore this email.
                            </p>
                            <p style="margin:0;color:#7a879c;font-size:12px;line-height:1.6;word-break:break-all;">
                                Button not working? Copy this link into your browser:<br>{{ $verificationUrl }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
