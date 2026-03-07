/**
 * Trading Panel Components
 * Wall Street-style glassmorphism panels
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ViewStyle,
  Animated,
  TouchableOpacity,
} from 'react-native';
import {
  TradingColors,
  TradingSpacing,
  TradingRadius,
  TradingShadows,
  TradingTypography,
} from '../../theme/tradingTheme';

interface TradingPanelProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  icon?: string;
  style?: ViewStyle;
  variant?: 'default' | 'glow' | 'success' | 'warning' | 'danger';
  animated?: boolean;
  onPress?: () => void;
}

export const TradingPanel: React.FC<TradingPanelProps> = ({
  children,
  title,
  subtitle,
  icon,
  style,
  variant = 'default',
  animated = true,
  onPress,
}) => {
  const scaleAnim = useRef(new Animated.Value(0.98)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, []);

  const getBorderColor = () => {
    switch (variant) {
      case 'glow':
        return TradingColors.electricBlue;
      case 'success':
        return TradingColors.neonGreen;
      case 'warning':
        return TradingColors.warning;
      case 'danger':
        return TradingColors.negative;
      default:
        return TradingColors.panelBorder;
    }
  };

  const content = (
    <Animated.View
      style={[
        styles.panel,
        { borderColor: getBorderColor() },
        variant === 'glow' && TradingShadows.glow,
        variant === 'success' && TradingShadows.glowGreen,
        variant === 'danger' && TradingShadows.glowRed,
        animated && {
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        },
        style,
      ]}
    >
      {/* Grid pattern overlay */}
      <View style={styles.gridOverlay} />
      
      {(title || icon) && (
        <View style={styles.panelHeader}>
          <View style={styles.panelTitleRow}>
            {icon && <Text style={styles.panelIcon}>{icon}</Text>}
            <View>
              {title && <Text style={styles.panelTitle}>{title}</Text>}
              {subtitle && <Text style={styles.panelSubtitle}>{subtitle}</Text>}
            </View>
          </View>
          <View style={styles.statusIndicator} />
        </View>
      )}
      <View style={styles.panelContent}>{children}</View>
    </Animated.View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
};

// Metric Display Component
interface MetricDisplayProps {
  label: string;
  value: string | number;
  change?: number;
  prefix?: string;
  suffix?: string;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
}

export const MetricDisplay: React.FC<MetricDisplayProps> = ({
  label,
  value,
  change,
  prefix = '',
  suffix = '',
  size = 'md',
  animated = true,
}) => {
  const animValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (animated) {
      Animated.timing(animValue, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }).start();
    }
  }, []);

  const getValueStyle = () => {
    switch (size) {
      case 'lg':
        return TradingTypography.metric;
      case 'sm':
        return TradingTypography.metricSm;
      default:
        return TradingTypography.metricMd;
    }
  };

  return (
    <Animated.View
      style={[
        styles.metricContainer,
        animated && { opacity: animValue },
      ]}
    >
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={getValueStyle()}>
        {prefix}{typeof value === 'number' ? value.toLocaleString('en-IN') : value}{suffix}
      </Text>
      {change !== undefined && (
        <View style={[
          styles.changeIndicator,
          { backgroundColor: change >= 0 ? TradingColors.neonGreenBg : TradingColors.negativeBg },
        ]}>
          <Text style={[
            styles.changeText,
            { color: change >= 0 ? TradingColors.neonGreen : TradingColors.negative },
          ]}>
            {change >= 0 ? '▲' : '▼'} {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
      )}
    </Animated.View>
  );
};

// Terminal Input Component
interface TerminalInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  prefix?: string;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  editable?: boolean;
}

export const TerminalInput: React.FC<TerminalInputProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  prefix,
  keyboardType = 'default',
  editable = true,
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const { TextInput } = require('react-native');

  return (
    <View style={styles.terminalInputContainer}>
      <Text style={styles.terminalInputLabel}>{label}</Text>
      <View style={[
        styles.terminalInputWrapper,
        isFocused && styles.terminalInputFocused,
      ]}>
        {prefix && <Text style={styles.terminalInputPrefix}>{prefix}</Text>}
        <TextInput
          style={styles.terminalInput}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={TradingColors.textDisabled}
          keyboardType={keyboardType}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
      </View>
    </View>
  );
};

// Status Badge Component
interface StatusBadgeProps {
  status: 'positive' | 'negative' | 'neutral' | 'warning';
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const getColors = () => {
    switch (status) {
      case 'positive':
        return { bg: TradingColors.neonGreenBg, text: TradingColors.neonGreen };
      case 'negative':
        return { bg: TradingColors.negativeBg, text: TradingColors.negative };
      case 'warning':
        return { bg: TradingColors.warningBg, text: TradingColors.warning };
      default:
        return { bg: TradingColors.electricBlueBg, text: TradingColors.electricBlue };
    }
  };

  const colors = getColors();

  return (
    <View style={[styles.statusBadge, { backgroundColor: colors.bg }]}>
      <View style={[styles.statusDot, { backgroundColor: colors.text }]} />
      <Text style={[styles.statusBadgeText, { color: colors.text }]}>{label}</Text>
    </View>
  );
};

// Data Row Component
interface DataRowProps {
  label: string;
  value: string;
  icon?: string;
  valueColor?: string;
}

export const DataRow: React.FC<DataRowProps> = ({
  label,
  value,
  icon,
  valueColor = TradingColors.textPrimary,
}) => (
  <View style={styles.dataRow}>
    <View style={styles.dataRowLeft}>
      {icon && <Text style={styles.dataRowIcon}>{icon}</Text>}
      <Text style={styles.dataRowLabel}>{label}</Text>
    </View>
    <Text style={[styles.dataRowValue, { color: valueColor }]}>{value}</Text>
  </View>
);

// Mini Chart Component (placeholder visual)
interface MiniChartProps {
  data: number[];
  color?: string;
  height?: number;
}

export const MiniChart: React.FC<MiniChartProps> = ({
  data,
  color = TradingColors.neonGreen,
  height = 40,
}) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  return (
    <View style={[styles.miniChart, { height }]}>
      {data.map((value, index) => {
        const barHeight = ((value - min) / range) * height * 0.8 + height * 0.2;
        return (
          <View
            key={index}
            style={[
              styles.miniChartBar,
              {
                height: barHeight,
                backgroundColor: color,
                opacity: 0.3 + (index / data.length) * 0.7,
              },
            ]}
          />
        );
      })}
      {/* Trend line */}
      <View style={[styles.miniChartLine, { backgroundColor: color }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    backgroundColor: TradingColors.panelGlass,
    borderRadius: TradingRadius.lg,
    borderWidth: 1,
    borderColor: TradingColors.panelBorder,
    overflow: 'hidden',
    ...TradingShadows.panel,
  },
  gridOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: TradingColors.gridLine,
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: TradingSpacing.lg,
    paddingTop: TradingSpacing.lg,
    paddingBottom: TradingSpacing.md,
    borderBottomWidth: 1,
    borderBottomColor: TradingColors.divider,
  },
  panelTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TradingSpacing.sm,
  },
  panelIcon: {
    fontSize: 20,
  },
  panelTitle: {
    ...TradingTypography.h4,
  },
  panelSubtitle: {
    ...TradingTypography.caption,
    marginTop: 2,
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: TradingColors.neonGreen,
  },
  panelContent: {
    padding: TradingSpacing.lg,
  },
  // Metric styles
  metricContainer: {
    alignItems: 'flex-start',
  },
  metricLabel: {
    ...TradingTypography.label,
    marginBottom: TradingSpacing.xs,
  },
  changeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TradingSpacing.sm,
    paddingVertical: TradingSpacing.xxs,
    borderRadius: TradingRadius.xs,
    marginTop: TradingSpacing.xs,
  },
  changeText: {
    ...TradingTypography.captionMedium,
    fontWeight: '600',
  },
  // Terminal Input styles
  terminalInputContainer: {
    marginBottom: TradingSpacing.lg,
  },
  terminalInputLabel: {
    ...TradingTypography.label,
    marginBottom: TradingSpacing.sm,
  },
  terminalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TradingColors.background,
    borderRadius: TradingRadius.md,
    borderWidth: 1,
    borderColor: TradingColors.panelBorder,
    paddingHorizontal: TradingSpacing.md,
  },
  terminalInputFocused: {
    borderColor: TradingColors.electricBlue,
    ...TradingShadows.glow,
  },
  terminalInputPrefix: {
    ...TradingTypography.monoLarge,
    color: TradingColors.neonGreen,
    marginRight: TradingSpacing.sm,
  },
  terminalInput: {
    flex: 1,
    ...TradingTypography.mono,
    paddingVertical: TradingSpacing.md,
    color: TradingColors.textPrimary,
  },
  // Status Badge styles
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TradingSpacing.sm,
    paddingVertical: TradingSpacing.xxs,
    borderRadius: TradingRadius.full,
    gap: TradingSpacing.xs,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    ...TradingTypography.captionMedium,
  },
  // Data Row styles
  dataRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: TradingSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: TradingColors.divider,
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: TradingSpacing.sm,
  },
  dataRowIcon: {
    fontSize: 16,
  },
  dataRowLabel: {
    ...TradingTypography.body,
  },
  dataRowValue: {
    ...TradingTypography.mono,
  },
  // Mini Chart styles
  miniChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
    position: 'relative',
  },
  miniChartBar: {
    flex: 1,
    borderRadius: 2,
  },
  miniChartLine: {
    position: 'absolute',
    bottom: '50%',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
});

export default TradingPanel;
