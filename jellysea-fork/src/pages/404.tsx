import PageTitle from '@app/components/Common/PageTitle';
import defineMessages from '@app/utils/defineMessages';
import { ArrowRightCircleIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import { useIntl } from 'react-intl';

const messages = defineMessages('pages', {
  errormessagewithcode: '{statusCode} - {error}',
  pagenotfound: 'Page Not Found',
  returnHome: 'Return Home',
});

const Custom404 = () => {
  const intl = useIntl();

  return (
    <div className="error-message">
      <PageTitle title={intl.formatMessage(messages.pagenotfound)} />
      <div className="text-4xl">
        {intl.formatMessage(messages.errormessagewithcode, {
          statusCode: 404,
          error: intl.formatMessage(messages.pagenotfound),
        })}
      </div>
      <Link
        href="/"
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-600"
      >
        {intl.formatMessage(messages.returnHome)}
        <ArrowRightCircleIcon className="h-5 w-5" />
      </Link>
    </div>
  );
};

export default Custom404;
