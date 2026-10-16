import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AxiosError, AxiosHeaders } from 'axios';
import { ReviewForm } from '../ReviewForm';

describe('ReviewForm', () => {
  it('blocks submission when the reason is shorter than 10 characters', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText(/Suspicious/));
    await userEvent.type(screen.getByLabelText(/Reason/), 'too short');
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
    expect(await screen.findByText(/at least 10 characters \(9\/10\)/)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('requires a decision', async () => {
    const onSubmit = vi.fn();
    render(<ReviewForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText(/Reason/), 'long enough reason');
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
    expect(await screen.findByText('Choose a decision.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits a trimmed reason and clears the form', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ReviewForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText(/Legitimate/));
    await userEvent.type(screen.getByLabelText(/Reason/), '  Matches seller records  ');
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('legitimate', 'Matches seller records'));
    await waitFor(() => expect(screen.getByLabelText(/Reason/)).toHaveValue(''));
  });

  it('shows backend validation and conflict messages and keeps the input', async () => {
    const err = new AxiosError('x', 'ERR', undefined, undefined, {
      status: 409, statusText: '', headers: {}, config: { headers: new AxiosHeaders() }, data: { message: 'Image was reviewed by someone else' },
    });
    const onSubmit = vi.fn().mockRejectedValue(err);
    render(<ReviewForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByLabelText(/Confirmed/));
    await userEvent.type(screen.getByLabelText(/Reason/), 'Same photo on two farms');
    await userEvent.click(screen.getByRole('button', { name: 'Save review' }));
    expect(await screen.findByText('Image was reviewed by someone else')).toBeInTheDocument();
    expect(screen.getByLabelText(/Reason/)).toHaveValue('Same photo on two farms');
  });
});
