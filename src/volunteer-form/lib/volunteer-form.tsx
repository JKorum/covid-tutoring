import React from 'react';

import { MessageDescriptor, IntlShape, injectIntl } from 'react-intl';
import { TextField } from '@rmwc/textfield';
import { ListDivider } from '@rmwc/list';
import { Typography } from '@rmwc/typography';
import { Card } from '@rmwc/card';

import ScheduleInput from '@tutorbook/schedule-input';
import SubjectSelect from '@tutorbook/subject-select';
import firebase, { UserProvider } from '@tutorbook/firebase';
import {
  Availability,
  UserInterface,
  SocialTypeAlias,
  User,
} from '@tutorbook/model';
import CheckmarkOverlay from '@tutorbook/checkmark-overlay';
import Button from '@tutorbook/button';

import Toggle from './toggle';

import msgs from './msgs';
import styles from './volunteer-form.module.scss';

interface VolunteerFormProps {
  readonly intl: IntlShape;
}

type VolunteerFormState = {
  readonly submitting: boolean;
  readonly submitted: boolean;
  readonly activeForm: 0 | 1;
  readonly expertise: string[];
} & Partial<UserInterface> &
  { [type in SocialTypeAlias]: string };

/**
 * Wrapper for the two distinct volunteer sign-up forms:
 * 0. The mentor sign-up form where experts (e.g. grad students, professionals)
 * tell us what they're working on so we can match them up with students who are
 * interested in working on the same thing.
 * 1. The volunteer tutor sign-up form where altruistic individuals can sign-up
 * to help tutor somebody affected by COVID-19.
 */
class VolunteerForm extends React.Component<VolunteerFormProps> {
  public readonly state: VolunteerFormState = {
    submitting: false,
    submitted: false,
    activeForm: 0,
    name: '',
    email: '',
    phone: '',
    bio: '',
    expertise: [] as string[],
    subjects: { explicit: [], implicit: [], filled: [] },
    website: '',
    linkedin: '',
    twitter: '',
    facebook: '',
    instagram: '',
  };

  public constructor(props: VolunteerFormProps) {
    super(props);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  public render(): JSX.Element {
    return (
      <div className={styles.wrapper}>
        <div className={styles.content}>
          <Toggle
            options={[
              this.props.intl.formatMessage(msgs.mentorToggle),
              this.props.intl.formatMessage(msgs.tutorToggle),
            ]}
            onChange={(activeForm: 0 | 1) => this.setState({ activeForm })}
          />
          <Typography use='headline2'>
            {this.props.intl.formatMessage(this.header)}
          </Typography>
          <Typography use='body1'>
            {this.props.intl.formatMessage(this.description)}
          </Typography>
        </div>
        <div className={styles.formWrapper}>
          <div className={styles.content}>
            <Card className={styles.formCard}>
              <CheckmarkOverlay
                active={this.state.submitting || this.state.submitted}
                checked={this.state.submitted}
              />
              <form className={styles.form} onSubmit={this.handleSubmit}>
                {this.renderInputs()}
                <Button
                  className={styles.formSubmitButton}
                  label={this.props.intl.formatMessage(this.buttonLabel)}
                  disabled={this.state.submitting || this.state.submitted}
                  raised
                  arrow
                />
              </form>
            </Card>
          </div>
          <div className={styles.background} />
        </div>
      </div>
    );
  }

  private renderInputs(): JSX.Element {
    const msg = (msg: MessageDescriptor) => this.props.intl.formatMessage(msg);
    const sharedProps = {
      className: styles.formField,
      outlined: true,
      required: true,
    };
    const shared = (key: keyof VolunteerFormState) => ({
      onChange: (event: React.FormEvent<HTMLInputElement>) => {
        this.setState({ [key]: event.currentTarget.value });
      },
      ...sharedProps,
    });
    const s = (id: string, placeholder: (v: string) => string) => ({
      value: (this.state as Record<string, any>)[id],
      label: msg((msgs as Record<string, MessageDescriptor>)[id]),
      type: 'url',
      onFocus: () => {
        const username: string = this.state.name
          ? this.state.name.replace(' ', '').toLowerCase()
          : 'yourname';
        if (!(this.state as Record<string, any>)[id])
          this.setState({ [id]: placeholder(username) });
      },
      onChange: (event: React.FormEvent<HTMLInputElement>) => {
        this.setState({ [id]: event.currentTarget.value });
      },
      ...sharedProps,
    });
    return (
      <>
        <TextField {...shared('name')} label={msg({ id: 'form.name' })} />
        <TextField {...shared('email')} label={msg({ id: 'form.email' })} />
        <TextField {...shared('phone')} label={msg({ id: 'form.phone' })} />
        <ListDivider className={styles.divider} />
        {this.state.activeForm === 0 && (
          <>
            <SubjectSelect
              {...shared('expertise')}
              label={msg(msgs.expertise)}
              placeholder={msg(msgs.expertisePlaceholder)}
              onChange={(expertise: string[]) => this.setState({ expertise })}
              searchIndex='expertise'
            />
            <TextField
              {...shared('bio')}
              label={msg(msgs.project)}
              placeholder={msg(msgs.projectPlaceholder)}
              rows={4}
              textarea
            />
          </>
        )}
        {this.state.activeForm === 1 && (
          <>
            <SubjectSelect
              {...shared('subjects')}
              label={msg(msgs.subjects)}
              placeholder={msg(msgs.subjectsPlaceholder)}
              onChange={(subjects: string[]) => this.setState({ subjects })}
            />
            <ScheduleInput
              {...shared('availability')}
              label={msg(msgs.availability)}
              onChange={(availability: Availability) =>
                this.setState({ availability })
              }
            />
            <TextField
              {...shared('bio')}
              label={msg(msgs.experience)}
              rows={4}
              textarea
            />
          </>
        )}
        <ListDivider className={styles.divider} />
        <TextField {...s('website', (v) => `https://${v}.com`)} />
        <TextField {...s('linkedin', (v) => `https://linkedin.com/in/${v}`)} />
        <TextField {...s('twitter', (v) => `https://twitter.com/${v}`)} />
        <TextField {...s('facebook', (v) => `https://facebook.com/${v}`)} />
        <TextField {...s('instagram', (v) => `https://instagram.com/${v}`)} />
      </>
    );
  }

  private get buttonLabel(): MessageDescriptor {
    return this.state.activeForm === 0 ? msgs.mentorSubmit : msgs.tutorSubmit;
  }

  private get header(): MessageDescriptor {
    return this.state.activeForm === 0 ? msgs.mentorHeader : msgs.tutorHeader;
  }

  private get description(): MessageDescriptor {
    return this.state.activeForm === 0 ? msgs.mentorDesc : msgs.tutorDesc;
  }

  private async handleSubmit(event: React.FormEvent): Promise<void> {
    event.preventDefault();
    firebase.analytics().logEvent('sign_up', {
      method: this.state.activeForm === 0 ? 'mentor_form' : 'tutor_form',
    });
    const socials = ([
      'website',
      'linkedin',
      'facebook',
      'twitter',
      'instagram',
    ] as SocialTypeAlias[]).map((type: SocialTypeAlias) => ({
      type,
      url: (this.state as Record<string, any>)[type] as string,
    }));
    const tutor: User = new User({ ...this.state, socials });
    this.setState({ submitting: true, submitted: false });
    await UserProvider.signup(tutor);
    this.setState({ submitting: false, submitted: true });
  }
}

export default injectIntl(VolunteerForm);