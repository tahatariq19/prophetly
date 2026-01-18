import { TrendingUp, Upload, Settings, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroProps {
    onGetStarted: () => void;
}

export function Hero({ onGetStarted }: HeroProps) {
    return (
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {/* Animated background effects */}
            <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -top-1/2 -left-1/2 w-full h-full bg-gradient-to-br from-purple-500/20 to-transparent rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-1/2 -right-1/2 w-full h-full bg-gradient-to-tl from-cyan-500/20 to-transparent rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
                {/* Logo/Title */}
                <div className="flex items-center justify-center gap-3 mb-6">
                    <div className="p-3 rounded-2xl bg-gradient-to-br from-purple-500 to-cyan-500 shadow-lg shadow-purple-500/25">
                        <TrendingUp className="w-10 h-10 text-white" />
                    </div>
                    <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
                        Prophetly
                    </h1>
                </div>

                {/* Subtitle */}
                <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto">
                    Powerful time series forecasting with Facebook Prophet.
                    <br />
                    <span className="text-purple-300">Beautiful. Intuitive. Free.</span>
                </p>

                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12 max-w-3xl mx-auto">
                    <FeatureCard
                        icon={<Upload className="w-6 h-6" />}
                        title="Upload Your Data"
                        description="CSV upload with automatic column detection"
                    />
                    <FeatureCard
                        icon={<Settings className="w-6 h-6" />}
                        title="Configure Model"
                        description="Full control over Prophet parameters"
                    />
                    <FeatureCard
                        icon={<BarChart3 className="w-6 h-6" />}
                        title="Visualize Forecasts"
                        description="Interactive charts with uncertainty bands"
                    />
                </div>

                {/* CTA Button */}
                <Button
                    onClick={onGetStarted}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white px-8 py-6 text-lg rounded-xl shadow-lg shadow-purple-500/25 transition-all duration-300 hover:scale-105"
                >
                    Get Started
                </Button>

                {/* Footer text */}
                <p className="mt-8 text-sm text-slate-500">
                    No sign-up required • Privacy-first • Open source
                </p>
            </div>
        </section>
    );
}

function FeatureCard({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div className="p-4 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors">
            <div className="flex items-center gap-3 mb-2">
                <div className="text-purple-400">{icon}</div>
                <h3 className="font-semibold text-white">{title}</h3>
            </div>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
    );
}
