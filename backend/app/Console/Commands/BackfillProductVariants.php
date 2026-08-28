<?php

namespace App\Console\Commands;

use App\Models\Product;
use Illuminate\Console\Command;

class BackfillProductVariants extends Command
{
    protected $signature = 'products:backfill-variants {--dry-run : List what would change without writing}';

    protected $description = 'Give every product missing a selling option the default one it should have';

    /**
     * The original backfill migration only covered products that existed when it
     * ran, so anything created before variants shipped - or imported since - can
     * still have none, which leaves it unsellable. This is safe to re-run: it
     * skips every product that already has an option.
     */
    public function handle(): int
    {
        $dryRun = (bool) $this->option('dry-run');
        $healed = 0;
        $skipped = 0;

        Product::query()
            ->with('variants')
            ->orderBy('id')
            ->chunkById(200, function ($products) use (&$healed, &$skipped, $dryRun) {
                foreach ($products as $product) {
                    if ($product->variants->isNotEmpty()) {
                        $skipped++;
                        continue;
                    }

                    $name = trim((string) $product->category) ?: 'Default';

                    if ($dryRun) {
                        $this->line("  would add \"{$name}\" to #{$product->id} {$product->title}");
                    } else {
                        $product->ensureDefaultVariant();
                        $this->line("  added \"{$name}\" to #{$product->id} {$product->title}");
                    }

                    $healed++;
                }
            });

        $verb = $dryRun ? 'would be given' : 'given';
        $this->info("{$healed} product(s) {$verb} a default option; {$skipped} already had one.");

        return self::SUCCESS;
    }
}
