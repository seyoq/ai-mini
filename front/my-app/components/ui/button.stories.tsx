import {StoryObj, Meta} from '@storybook/react';

import { Button } from './button';

export default {
  title: 'button',
  component: Button,
  args: {
    
  },
} as Meta<typeof Button>;

type Story = StoryObj<typeof Button>;

export const Default: Story = {
  args: {},
};
